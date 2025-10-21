import { FolderRepository } from '../../domain/repositories/FolderRepository';
import { Folder } from '../../domain/entities/Folder';
import { prisma } from '../database/prisma';

export class PrismaFolderRepository implements FolderRepository {
  async findById(id: string): Promise<Folder | null> {
    const folder = await prisma.folder.findUnique({
      where: { id },
    });
    return folder ? this.toDomain(folder) : null;
  }

  async findByPath(userId: string, path: string): Promise<Folder | null> {
    const folder = await prisma.folder.findUnique({
      where: {
        userId_path: {
          userId,
          path,
        },
      },
    });
    return folder ? this.toDomain(folder) : null;
  }

  async findByParentId(parentId: string): Promise<Folder[]> {
    const folders = await prisma.folder.findMany({
      where: { parentId },
      orderBy: { name: 'asc' },
    });
    return folders.map(this.toDomain);
  }

  async findRootFolder(userId: string): Promise<Folder | null> {
    const folder = await prisma.folder.findFirst({
      where: {
        userId,
        isRoot: true,
      },
    });
    return folder ? this.toDomain(folder) : null;
  }

  async findAllByUserId(userId: string): Promise<Folder[]> {
    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { path: 'asc' },
    });
    return folders.map(this.toDomain);
  }

  async create(folder: Folder): Promise<Folder> {
    const created = await prisma.folder.create({
      data: {
        name: folder.name,
        slug: folder.slug,
        path: folder.path,
        parentId: folder.parentId,
        isRoot: folder.isRoot,
        userId: folder.userId,
      },
    });
    return this.toDomain(created);
  }

  async update(folder: Folder): Promise<Folder> {
    const updated = await prisma.folder.update({
      where: { id: folder.id },
      data: {
        name: folder.name,
        slug: folder.slug,
        path: folder.path,
        parentId: folder.parentId,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.folder.delete({
      where: { id },
    });
  }

  async exists(userId: string, path: string): Promise<boolean> {
    const folder = await prisma.folder.findUnique({
      where: {
        userId_path: {
          userId,
          path,
        },
      },
    });
    return !!folder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(prismaFolder: any): Folder {
    return new Folder(
      prismaFolder.id,
      prismaFolder.name,
      prismaFolder.slug,
      prismaFolder.path,
      prismaFolder.userId,
      prismaFolder.parentId || undefined,
      prismaFolder.isRoot,
      prismaFolder.createdAt,
      prismaFolder.updatedAt
    );
  }
}