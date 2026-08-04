import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/src/DIContainer';
import { prisma } from '@/src/infrastructure/database/prisma';
import { resolveInside, uploadsRoot, userStoragePath } from '@/src/lib/file-storage';
import {
  consumeRateLimit,
  envPositiveInt,
  getClientIp,
  getRequestId,
  isMongoObjectId,
  rateLimitResponse,
  requireAuthenticatedUser,
  securityLog,
} from '@/src/lib/security';
import { isUploadSizeAllowed, normalizeImage, wouldExceedUploadQuota } from '@/src/lib/upload-security';
import type { File as DomainFile } from '@/src/domain/entities/File';

let activeUploads = 0;

async function removeIfPresent(filePath: string): Promise<void> {
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const requestId = getRequestId(request);
  const maxBytes = envPositiveInt('UPLOAD_MAX_BYTES', 10 * 1024 * 1024);
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes + 1024 * 1024) {
    securityLog('upload_rejected', { requestId, userId: auth.user.id, reason: 'request_too_large' });
    return NextResponse.json({ success: false, error: 'Upload exceeds the 10 MB limit' }, { status: 413 });
  }

  const limit = consumeRateLimit(
    `upload:${auth.user.id}:${getClientIp(request)}`,
    envPositiveInt('UPLOAD_RATE_LIMIT', 30),
    60 * 60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit);
  const maxConcurrent = envPositiveInt('UPLOAD_MAX_CONCURRENT', 2);
  if (activeUploads >= maxConcurrent) {
    return NextResponse.json(
      { success: false, error: 'Too many concurrent uploads' },
      { status: 429, headers: { 'Retry-After': '5' } },
    );
  }

  activeUploads += 1;
  try {
    const formData = await request.formData();
    const uploaded = formData.get('file');
    const folderId = formData.get('folderId');
    const visibility = formData.get('isPublic');
    if (!(uploaded instanceof File) || !isMongoObjectId(folderId)) {
      return NextResponse.json({ success: false, error: 'File and valid folderId are required' }, { status: 400 });
    }
    if (visibility !== null && visibility !== 'true' && visibility !== 'false') {
      return NextResponse.json({ success: false, error: 'Invalid visibility' }, { status: 400 });
    }
    if (!isUploadSizeAllowed(uploaded.size, maxBytes)) {
      securityLog('upload_rejected', { requestId, userId: auth.user.id, reason: 'file_too_large' });
      return NextResponse.json({ success: false, error: 'Upload exceeds the 10 MB limit' }, { status: 413 });
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: auth.user.id },
      select: { id: true },
    });
    if (!folder) {
      securityLog('cross_user_folder_access_rejected', { requestId, userId: auth.user.id });
      return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
    }

    const totalQuota = envPositiveInt('UPLOAD_TOTAL_QUOTA_BYTES', 1024 * 1024 * 1024);
    const dailyQuota = envPositiveInt('UPLOAD_DAILY_QUOTA_BYTES', 100 * 1024 * 1024);
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const [total, daily] = await Promise.all([
      prisma.file.aggregate({ where: { userId: auth.user.id }, _sum: { size: true } }),
      prisma.file.aggregate({ where: { userId: auth.user.id, createdAt: { gte: since } }, _sum: { size: true } }),
    ]);
    if (wouldExceedUploadQuota(
      total._sum.size || 0,
      daily._sum.size || 0,
      uploaded.size,
      totalQuota,
      dailyQuota,
    )) {
      securityLog('upload_quota_exceeded', { requestId, userId: auth.user.id });
      return NextResponse.json({ success: false, error: 'Upload quota exceeded' }, { status: 413 });
    }

    let normalized;
    try {
      normalized = await normalizeImage(Buffer.from(await uploaded.arrayBuffer()), uploaded.name);
    } catch (error) {
      securityLog('upload_rejected', {
        requestId,
        userId: auth.user.id,
        reason: error instanceof Error ? error.message : 'invalid_image',
      });
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid image' },
        { status: 415 },
      );
    }
    if (normalized.buffer.length > maxBytes) {
      return NextResponse.json({ success: false, error: 'Normalized image exceeds the limit' }, { status: 413 });
    }
    if (wouldExceedUploadQuota(
      total._sum.size || 0,
      daily._sum.size || 0,
      normalized.buffer.length,
      totalQuota,
      dailyQuota,
    )) {
      securityLog('upload_quota_exceeded', { requestId, userId: auth.user.id });
      return NextResponse.json({ success: false, error: 'Upload quota exceeded' }, { status: 413 });
    }

    const filesDir = resolveInside(uploadsRoot, 'users', auth.user.id, 'files');
    const thumbsDir = resolveInside(uploadsRoot, 'users', auth.user.id, 'thumbs');
    await Promise.all([mkdir(filesDir, { recursive: true }), mkdir(thumbsDir, { recursive: true })]);
    const operationId = crypto.randomUUID();
    const originalTemp = resolveInside(filesDir, `upload-${operationId}.tmp`);
    const smallTemp = resolveInside(thumbsDir, `upload-${operationId}-small.tmp`);
    const mediumTemp = resolveInside(thumbsDir, `upload-${operationId}-medium.tmp`);
    const [small, medium] = await Promise.all([
      sharp(normalized.buffer).resize(150, 150, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer(),
      sharp(normalized.buffer).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer(),
    ]);
    try {
      await Promise.all([
        writeFile(originalTemp, normalized.buffer, { flag: 'wx' }),
        writeFile(smallTemp, small, { flag: 'wx' }),
        writeFile(mediumTemp, medium, { flag: 'wx' }),
      ]);
    } catch (error) {
      await Promise.allSettled([
        removeIfPresent(originalTemp), removeIfPresent(smallTemp), removeIfPresent(mediumTemp),
      ]);
      throw error;
    }

    let databaseFile: DomainFile | null = null;
    const finalPaths: string[] = [];
    try {
      databaseFile = await DIContainer.getInstance().getMediaManagerUseCase().uploadFile({
        originalName: normalized.originalName,
        buffer: normalized.buffer,
        mimeType: normalized.mimeType,
        folderId,
        userId: auth.user.id,
        // Ce service est un CDN public par défaut. Le propriétaire reste dérivé
        // exclusivement de la session serveur.
        isPublic: visibility !== 'false',
      });
      const stem = path.basename(databaseFile.name, path.extname(databaseFile.name));
      const originalFinal = userStoragePath(auth.user.id, 'files', databaseFile.name);
      const smallFinal = userStoragePath(auth.user.id, 'thumbs', `${stem}-small.jpg`);
      const mediumFinal = userStoragePath(auth.user.id, 'thumbs', `${stem}-medium.jpg`);
      await rename(originalTemp, originalFinal); finalPaths.push(originalFinal);
      await rename(smallTemp, smallFinal); finalPaths.push(smallFinal);
      await rename(mediumTemp, mediumFinal); finalPaths.push(mediumFinal);
    } catch (error) {
      await Promise.allSettled([
        removeIfPresent(originalTemp), removeIfPresent(smallTemp), removeIfPresent(mediumTemp),
        ...finalPaths.map(removeIfPresent),
      ]);
      if (databaseFile) {
        await prisma.file.deleteMany({ where: { id: databaseFile.id, userId: auth.user.id } });
      }
      throw error;
    }

    securityLog('upload_accepted', {
      requestId,
      userId: auth.user.id,
      fileId: databaseFile.id,
      size: normalized.buffer.length,
      type: normalized.mimeType,
    });
    return NextResponse.json({ success: true, data: databaseFile }, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  } finally {
    activeUploads -= 1;
  }
}
