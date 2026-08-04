import { lstat, rename, unlink } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/database/prisma';
import { resolveInside, userStoragePath } from '@/src/lib/file-storage';
import {
  consumeRateLimit,
  getRequestId,
  isMongoObjectId,
  rateLimitResponse,
  requireAuthenticatedUser,
  securityLog,
} from '@/src/lib/security';

async function stageIfPresent(filePath: string, operationId: string) {
  try {
    const stats = await lstat(filePath);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('Unsafe storage target');
    const stagedPath = resolveInside(path.dirname(filePath), `delete-${operationId}-${path.basename(filePath)}`);
    await rename(filePath, stagedPath);
    return { filePath, stagedPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const limit = consumeRateLimit(`file-delete:${auth.user.id}`, 60, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const requestId = getRequestId(request);
  const { fileId } = await params;
  if (!isMongoObjectId(fileId)) {
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  }
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId: auth.user.id },
    select: { id: true, userId: true, name: true },
  });
  if (!file) {
    securityLog('cross_user_file_delete_rejected', { requestId, userId: auth.user.id });
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  }

  const stem = file.name.replace(/\.[^.]+$/, '');
  const paths = [
    userStoragePath(file.userId, 'files', file.name),
    userStoragePath(file.userId, 'thumbs', `${stem}-small.jpg`),
    userStoragePath(file.userId, 'thumbs', `${stem}-medium.jpg`),
  ];
  const operationId = crypto.randomUUID();
  const staged: Array<{ filePath: string; stagedPath: string }> = [];
  try {
    for (const filePath of paths) {
      const result = await stageIfPresent(filePath, operationId);
      if (result) staged.push(result);
    }
    const deleted = await prisma.file.deleteMany({ where: { id: file.id, userId: auth.user.id } });
    if (deleted.count !== 1) throw new Error('Database delete was not applied');
  } catch (error) {
    await Promise.allSettled(staged.map(({ filePath, stagedPath }) => rename(stagedPath, filePath)));
    console.error('Delete failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Unable to delete file safely' }, { status: 500 });
  }

  const cleanup = await Promise.allSettled(staged.map(({ stagedPath }) => unlink(stagedPath)));
  if (cleanup.some((result) => result.status === 'rejected')) {
    securityLog('file_delete_cleanup_pending', { requestId, fileId: file.id });
  }
  securityLog('file_deleted', { requestId, userId: auth.user.id, fileId: file.id });
  return NextResponse.json({ success: true });
}
