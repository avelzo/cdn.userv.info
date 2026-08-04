import { NextRequest } from 'next/server';
import { serveStoredFile } from '@/src/lib/file-storage';
import { getOptionalAuthenticatedUserId, getRequestId } from '@/src/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; thumbnail: string }> },
) {
  const { userId, thumbnail } = await params;
  return serveStoredFile({
    userId,
    filename: thumbnail,
    kind: 'thumbs',
    sessionUserId: await getOptionalAuthenticatedUserId(request),
    requestId: getRequestId(request),
    requestPath: request.nextUrl.pathname,
  });
}
