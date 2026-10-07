import { NextResponse } from 'next/server';
import { uploadsRoot } from '@/src/lib/file-storage';
import { isInternalUploadAuthorized } from '@/src/lib/internal-upload-auth';
import { SITE_THUMBNAIL_MAX_BYTES, storeSiteThumbnail } from '@/src/lib/site-thumbnail';
import { normalizeSiteThumbnail } from '@/src/lib/upload-security';
import { consumeRateLimit, getClientIp, getRequestId, rateLimitResponse, securityLog } from '@/src/lib/security';

let activeUploads = 0;

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isInternalUploadAuthorized(request.headers.get('authorization'), process.env.CDN_PORTAL_UPLOAD_TOKEN)) {
    securityLog('portal_thumbnail_upload_rejected', { requestId, reason: 'unauthorized' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > SITE_THUMBNAIL_MAX_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 });
  }
  const limit = consumeRateLimit(`portal-thumbnail:${getClientIp(request)}`, 30, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (activeUploads >= 2) return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });

  activeUploads += 1;
  try {
    const uploaded = (await request.formData()).get('file');
    if (!(uploaded instanceof File) || uploaded.size < 1 || uploaded.size > SITE_THUMBNAIL_MAX_BYTES) {
      return NextResponse.json({ error: 'Valid image required' }, { status: 400 });
    }
    const normalized = await normalizeSiteThumbnail(Buffer.from(await uploaded.arrayBuffer()), uploaded.name);
    const filename = await storeSiteThumbnail(uploadsRoot, normalized);
    const publicBase = process.env.BETTER_AUTH_URL || 'https://cdn.userv.info';
    const url = new URL(`/api/site-thumbnails/${filename}`, publicBase).toString();
    securityLog('portal_thumbnail_upload_accepted', { requestId, size: normalized.length });
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    securityLog('portal_thumbnail_upload_rejected', { requestId, reason: error instanceof Error ? error.message : 'invalid_image' });
    return NextResponse.json({ error: 'Invalid image' }, { status: 415 });
  } finally {
    activeUploads -= 1;
  }
}
