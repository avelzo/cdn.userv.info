import { NextRequest } from 'next/server';
import { serveStoredFile } from '@/src/lib/file-storage';
import { getOptionalAuthenticatedUserId, getRequestId } from '@/src/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; fileId: string }> },
) {
  const { userId, fileId } = await params;
  return serveStoredFile({
    userId,
    filename: fileId,
    kind: 'files',
    sessionUserId: await getOptionalAuthenticatedUserId(request),
    requestId: getRequestId(request),
    requestPath: request.nextUrl.pathname,
  });
}
