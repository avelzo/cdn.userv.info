import { NextRequest, NextResponse } from 'next/server';
import { serveStoredFile } from '@/src/lib/file-storage';
import { getOptionalAuthenticatedUserId, getRequestId, securityLog } from '@/src/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  if (segments.length !== 4 || segments[0] !== 'users'
    || (segments[2] !== 'files' && segments[2] !== 'thumbs')) {
    securityLog('path_traversal_rejected', { requestId: getRequestId(request) });
    return new NextResponse('Not found', { status: 404 });
  }
  return serveStoredFile({
    userId: segments[1],
    filename: segments[3],
    kind: segments[2],
    sessionUserId: await getOptionalAuthenticatedUserId(request),
    requestId: getRequestId(request),
    requestPath: request.nextUrl.pathname.replace(/^\/api/, ''),
  });
}
