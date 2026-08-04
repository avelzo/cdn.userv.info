import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/src/DIContainer';
import { prisma } from '@/src/infrastructure/database/prisma';
import {
  consumeRateLimit,
  getClientIp,
  rateLimitResponse,
  requireAuthenticatedUser,
} from '@/src/lib/security';

function validFolderName(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.trim().length <= 80
    && !/[\0/\\]/.test(value);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
  const rootFolder = await mediaManager.ensureUserRootFolder(auth.user.id);
  const folders = await mediaManager.getFolderTree(auth.user.id);
  return NextResponse.json({ success: true, data: { rootFolder, folders } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const limit = consumeRateLimit(
    `folder-create:${auth.user.id}:${getClientIp(request)}`,
    30,
    60 * 60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit);

  const body = await request.json().catch(() => null);
  if (!body || !validFolderName(body.name)) {
    return NextResponse.json({ success: false, error: 'Invalid folder name' }, { status: 400 });
  }

  if (body.parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: body.parentId, userId: auth.user.id },
      select: { id: true },
    }).catch(() => null);
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Parent folder not found' }, { status: 404 });
    }
  }

  try {
    const folder = await DIContainer.getInstance().getMediaManagerUseCase().createFolder({
      name: body.name.trim(),
      parentId: body.parentId || undefined,
      userId: auth.user.id,
    });
    return NextResponse.json({ success: true, data: folder }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to create folder' },
      { status: 400 },
    );
  }
}
