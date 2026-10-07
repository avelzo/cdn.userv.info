import { NextResponse } from 'next/server';
import { downloadHeaders, safeRead, uploadsRoot } from '@/src/lib/file-storage';
import { isSiteThumbnailFilename } from '@/src/lib/internal-upload-auth';
import { resolveInside } from '@/src/lib/storage-path';

type RouteParams = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { filename } = await params;
  if (!isSiteThumbnailFilename(filename)) return new NextResponse('Not found', { status: 404 });
  try {
    const body = await safeRead(resolveInside(uploadsRoot, 'site-thumbnails', filename));
    const headers = downloadHeaders(filename, true);
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    headers['Content-Length'] = String(body.length);
    return new NextResponse(body as unknown as BodyInit, { headers });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
