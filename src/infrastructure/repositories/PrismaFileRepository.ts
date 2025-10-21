import { FileRepository } from '../../domain/repositories/FileRepository';
import { File, FileMetadata } from '../../domain/entities/File';
import { prisma } from '../database/prisma';

export class PrismaFileRepository implements FileRepository {
  async findById(id: string): Promise<File | null> {
    const file = await prisma.file.findUnique({
      where: { id },
      include: { metadata: true },
    });
    return file ? this.toDomain(file) : null;
  }

  async findByPath(userId: string, path: string): Promise<File | null> {
    const file = await prisma.file.findUnique({
      where: {
        userId_path: {
          userId,
          path,
        },
      },
      include: { metadata: true },
    });
    return file ? this.toDomain(file) : null;
  }

  async findByFolderId(folderId: string): Promise<File[]> {
    const files = await prisma.file.findMany({
      where: { folderId },
      include: { metadata: true },
      orderBy: { createdAt: 'desc' },
    });
    return files.map(this.toDomain);
  }

  async findByUserId(userId: string): Promise<File[]> {
    const files = await prisma.file.findMany({
      where: { userId },
      include: { metadata: true },
      orderBy: { createdAt: 'desc' },
    });
    return files.map(this.toDomain);
  }

  async findByChecksum(checksum: string): Promise<File | null> {
    const file = await prisma.file.findFirst({
      where: { checksum },
      include: { metadata: true },
    });
    return file ? this.toDomain(file) : null;
  }

  async create(file: File): Promise<File> {
    const created = await prisma.file.create({
      data: {
        name: file.name,
        originalName: file.originalName,
        slug: file.slug,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
        url: file.url,
        checksum: file.checksum,
        isPublic: file.isPublic,
        userId: file.userId,
        folderId: file.folderId,
        metadata: file.metadata ? {
          create: {
            width: file.metadata.width,
            height: file.metadata.height,
            duration: file.metadata.duration,
            bitrate: file.metadata.bitrate,
            format: file.metadata.format,
          },
        } : undefined,
      },
      include: { metadata: true },
    });
    return this.toDomain(created);
  }

  async update(file: File): Promise<File> {
    const updated = await prisma.file.update({
      where: { id: file.id },
      data: {
        name: file.name,
        originalName: file.originalName,
        slug: file.slug,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
        url: file.url,
        checksum: file.checksum,
        isPublic: file.isPublic,
        updatedAt: new Date(),
      },
      include: { metadata: true },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.file.delete({
      where: { id },
    });
  }

  async exists(userId: string, path: string): Promise<boolean> {
    const file = await prisma.file.findUnique({
      where: {
        userId_path: {
          userId,
          path,
        },
      },
    });
    return !!file;
  }

  async findPublicFiles(): Promise<File[]> {
    const files = await prisma.file.findMany({
      where: { isPublic: true },
      include: { metadata: true },
      orderBy: { createdAt: 'desc' },
    });
    return files.map(this.toDomain);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(prismaFile: any): File {
    let metadata: FileMetadata | undefined;
    if (prismaFile.metadata) {
      metadata = {
        width: prismaFile.metadata.width || undefined,
        height: prismaFile.metadata.height || undefined,
        duration: prismaFile.metadata.duration || undefined,
        bitrate: prismaFile.metadata.bitrate || undefined,
        format: prismaFile.metadata.format || undefined,
      };
    }

    return new File(
      prismaFile.id,
      prismaFile.name,
      prismaFile.originalName,
      prismaFile.slug,
      prismaFile.mimeType,
      prismaFile.size,
      prismaFile.path,
      prismaFile.checksum,
      prismaFile.userId,
      prismaFile.folderId,
      prismaFile.isPublic,
      prismaFile.url || undefined,
      metadata,
      prismaFile.createdAt,
      prismaFile.updatedAt
    );
  }
}