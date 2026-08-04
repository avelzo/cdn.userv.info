import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/database/prisma';
import {
  consumeRateLimit,
  isMongoObjectId,
  rateLimitResponse,
  requireAuthenticatedUser,
  securityLog,
} from '@/src/lib/security';

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const folderId = request.nextUrl.searchParams.get('folderId');
  if (!isMongoObjectId(folderId)) {
    return NextResponse.json({ success: false, error: 'Invalid folder ID' }, { status: 400 });
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: auth.user.id },
    select: { id: true },
  });
  if (!folder) {
    return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
  }

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { parentId: folderId, userId: auth.user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        path: true,
        parentId: true,
        isRoot: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.file.findMany({
      where: { folderId, userId: auth.user.id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        url: true,
        isPublic: true,
        createdAt: true,
        metadata: {
          select: {
            width: true,
            height: true,
            duration: true,
            bitrate: true,
            format: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json(
    { success: true, data: { folders, files } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

const MAX_VISIBILITY_BATCH = 100;

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const limit = consumeRateLimit(`file-visibility:${auth.user.id}`, 120, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const candidate = body as { fileIds?: unknown; isPublic?: unknown };
  if (
    !Array.isArray(candidate.fileIds)
    || candidate.fileIds.length === 0
    || candidate.fileIds.length > MAX_VISIBILITY_BATCH
    || typeof candidate.isPublic !== 'boolean'
  ) {
    return NextResponse.json(
      { success: false, error: 'fileIds and isPublic are required' },
      { status: 400 },
    );
  }

  const fileIds = [...new Set(candidate.fileIds)];
  if (fileIds.length !== candidate.fileIds.length || !fileIds.every(isMongoObjectId)) {
    return NextResponse.json({ success: false, error: 'Invalid file IDs' }, { status: 400 });
  }

  // Vérifier toute la sélection avec le propriétaire dans la même requête avant
  // d'appliquer la moindre modification, afin d'éviter les mises à jour partielles.
  const ownedFiles = await prisma.file.findMany({
    where: { id: { in: fileIds }, userId: auth.user.id },
    select: { id: true },
  });
  if (ownedFiles.length !== fileIds.length) {
    securityLog('cross_user_file_visibility_rejected', {
      userId: auth.user.id,
      requestedCount: fileIds.length,
    });
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  }

  await prisma.file.updateMany({
    where: { id: { in: fileIds }, userId: auth.user.id },
    data: { isPublic: candidate.isPublic },
  });

  securityLog('file_visibility_updated', {
    userId: auth.user.id,
    fileCount: fileIds.length,
    isPublic: candidate.isPublic,
  });
  return NextResponse.json(
    { success: true, data: { fileIds, isPublic: candidate.isPublic } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
