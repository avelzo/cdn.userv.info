import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/src/DIContainer';
import { prisma } from '@/src/infrastructure/database/prisma';
import { consumeRateLimit, isMongoObjectId, rateLimitResponse, requireAuthenticatedUser } from '@/src/lib/security';

async function ownedFolder(folderId: string, userId: string) {
  if (!isMongoObjectId(folderId)) return null;
  return prisma.folder.findFirst({ where: { id: folderId, userId }, select: { id: true } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { folderId } = await params;
  if (!await ownedFolder(folderId, auth.user.id)) {
    return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || !body.name.trim()
    || body.name.trim().length > 80 || /[\0/\\]/.test(body.name)) {
    return NextResponse.json({ success: false, error: 'Invalid folder name' }, { status: 400 });
  }
  try {
    const folder = await DIContainer.getInstance().getMediaManagerUseCase()
      .renameFolder(folderId, body.name.trim(), auth.user.id);
    return NextResponse.json({ success: true, data: folder });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to rename folder' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const limit = consumeRateLimit(`folder-delete:${auth.user.id}`, 30, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const { folderId } = await params;
  if (!await ownedFolder(folderId, auth.user.id)) {
    return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
  }

  const [folderCount, fileCount] = await Promise.all([
    prisma.folder.count({ where: { parentId: folderId, userId: auth.user.id } }),
    prisma.file.count({ where: { folderId, userId: auth.user.id } }),
  ]);
  if (folderCount || fileCount) {
    return NextResponse.json({ success: false, error: 'Folder is not empty' }, { status: 409 });
  }
  try {
    await DIContainer.getInstance().getMediaManagerUseCase().deleteFolder(folderId, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to delete folder' },
      { status: 400 },
    );
  }
}
