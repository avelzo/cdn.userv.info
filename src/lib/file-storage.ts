import path from 'path';
import { lstat, readFile, realpath } from 'fs/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/database/prisma';
import { isMongoObjectId, securityLog } from '@/src/lib/security';
import { resolveInside } from '@/src/lib/storage-path';
import { mayReadStoredFile } from '@/src/lib/file-access-policy';

export { resolveInside } from '@/src/lib/storage-path';

export const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/;

function privateNotFound(): NextResponse {
  return new NextResponse('Not found', {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export function userStoragePath(
  userId: string,
  kind: 'files' | 'thumbs',
  filename: string,
): string {
  if (!isMongoObjectId(userId) || !SAFE_FILENAME.test(filename)) {
    throw new Error('Unsafe storage identifier');
  }
  return resolveInside(uploadsRoot, 'users', userId, kind, filename);
}

function commaSeparatedEnv(name: string): Set<string> {
  return new Set(
    (process.env[name] || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function legacyPublicPolicy() {
  return {
    fileIds: commaSeparatedEnv('CDN_LEGACY_PUBLIC_FILE_IDS'),
    userIds: commaSeparatedEnv('CDN_LEGACY_PUBLIC_USER_IDS'),
    paths: commaSeparatedEnv('CDN_LEGACY_PUBLIC_PATHS'),
  };
}

export function isLegacyPublicPath(urlPath: string): boolean {
  return commaSeparatedEnv('CDN_LEGACY_PUBLIC_PATHS').has(urlPath);
}

export async function safeRead(filePath: string): Promise<Buffer> {
  const rootRealPath = await realpath(uploadsRoot);
  const fileRealPath = await realpath(filePath);
  if (!fileRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
    throw new Error('Resolved path escapes storage root');
  }
  const stats = await lstat(fileRealPath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error('Storage target is not a regular file');
  }
  return readFile(fileRealPath);
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf',
};

export function downloadHeaders(
  filename: string,
  isPublic: boolean,
): Record<string, string> {
  const mimeType = MIME_BY_EXTENSION[path.extname(filename).toLowerCase()]
    || 'application/octet-stream';
  const inline = mimeType.startsWith('image/') || mimeType.startsWith('font/');
  return {
    'Content-Type': mimeType,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename.replace(/["\\\r\n]/g, '_')}"`,
    'Cache-Control': isPublic
      ? 'public, max-age=60, must-revalidate'
      : 'private, no-store',
  };
}

interface ServeStoredFileOptions {
  userId: string;
  filename: string;
  kind: 'files' | 'thumbs';
  sessionUserId?: string;
  requestId: string;
  requestPath: string;
}

export async function serveStoredFile({
  userId,
  filename,
  kind,
  sessionUserId,
  requestId,
  requestPath,
}: ServeStoredFileOptions): Promise<NextResponse> {
  if (!isMongoObjectId(userId) || !SAFE_FILENAME.test(filename)) {
    securityLog('path_traversal_rejected', { requestId });
    return privateNotFound();
  }

  const idMatch = kind === 'files'
    ? filename.match(/^([a-f\d]{24})\.[a-z0-9]+$/i)
    : filename.match(/^([a-f\d]{24})-(?:small|medium)\.jpg$/i);
  if (!idMatch || !isMongoObjectId(idMatch[1])) {
    return privateNotFound();
  }

  const file = await prisma.file.findFirst({
    where: { id: idMatch[1], userId, name: kind === 'files' ? filename : undefined },
    select: { id: true, userId: true, name: true, isPublic: true, url: true },
  });
  const legacyPathAllowed = isLegacyPublicPath(requestPath);
  if (!file && !legacyPathAllowed) {
    return privateNotFound();
  }

  const access = file
    ? mayReadStoredFile(file, sessionUserId, legacyPublicPolicy())
    : { allowed: legacyPathAllowed, publicAccess: legacyPathAllowed };
  if (!access.allowed) {
    securityLog('cross_user_file_access_rejected', { requestId, resourceId: idMatch[1] });
    return privateNotFound();
  }

  try {
    const physicalPath = userStoragePath(userId, kind, filename);
    const body = await safeRead(physicalPath);
    const headers = downloadHeaders(filename, access.publicAccess);
    headers['Content-Length'] = String(body.length);
    return new NextResponse(body as unknown as BodyInit, { status: 200, headers });
  } catch {
    return privateNotFound();
  }
}
