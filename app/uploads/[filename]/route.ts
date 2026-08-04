import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/database/prisma';
import { serveStoredFile } from '@/src/lib/file-storage';
import { getOptionalAuthenticatedUserId, getRequestId } from '@/src/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^[a-f\d]{24}\.[a-z0-9]+$/i.test(filename)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const matches = await prisma.file.findMany({
    where: { name: filename },
    select: { userId: true },
    take: 2,
  });
  if (matches.length !== 1) return new NextResponse('Not found', { status: 404 });
  return serveStoredFile({
    userId: matches[0].userId,
    filename,
    kind: 'files',
    sessionUserId: await getOptionalAuthenticatedUserId(request),
    requestId: getRequestId(request),
    requestPath: request.nextUrl.pathname,
  });
}
