import { FolderService } from '../../domain/services/FolderService';
import { FileService } from '../../domain/services/FileService';
import { Folder } from '../../domain/entities/Folder';
import { File } from '../../domain/entities/File';

export interface CreateFolderCommand {
  name: string;
  parentId?: string;
  userId: string;
}

export interface UploadFileCommand {
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  folderId: string;
  userId: string;
  isPublic?: boolean;
}

export class MediaManagerUseCase {
  constructor(
    private folderService: FolderService,
    private fileService: FileService
  ) {}

  async createFolder(command: CreateFolderCommand): Promise<Folder> {
    return await this.folderService.createFolder(
      command.name,
      command.parentId,
      command.userId
    );
  }

  async getFolderTree(userId: string): Promise<Folder[]> {
    return await this.folderService.getFolderTree(userId);
  }

  async getFolderContents(folderId: string, userId: string): Promise<{ folders: Folder[], files: File[] }> {
    const [folders, files] = await Promise.all([
      this.folderService.getFolderContents(folderId, userId),
      this.fileService.getFilesByFolder(folderId, userId)
    ]);

    return { folders, files };
  }

  async uploadFile(command: UploadFileCommand): Promise<File> {
    return await this.fileService.uploadFile({
      originalName: command.originalName,
      buffer: command.buffer,
      mimeType: command.mimeType,
      folderId: command.folderId,
      userId: command.userId,
      isPublic: command.isPublic
    });
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    await this.folderService.deleteFolder(folderId, userId);
  }

  async renameFolder(folderId: string, newName: string, userId: string): Promise<Folder> {
    return await this.folderService.renameFolder(folderId, newName, userId);
  }

  async getFileById(fileId: string): Promise<File | null> {
    return await this.fileService.getFileById(fileId);
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    await this.fileService.deleteFile(fileId, userId);
  }

  async ensureUserRootFolder(userId: string): Promise<Folder> {
    return await this.folderService.ensureRootFolder(userId);
  }
}