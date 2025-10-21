import { PrismaFolderRepository } from './infrastructure/repositories/PrismaFolderRepository';
import { PrismaFileRepository } from './infrastructure/repositories/PrismaFileRepository';
import { FolderService } from './domain/services/FolderService';
import { FileService } from './domain/services/FileService';
import { MediaManagerUseCase } from './application/use-cases/MediaManagerUseCase';

export class DIContainer {
  private static instance: DIContainer;
  private _mediaManagerUseCase: MediaManagerUseCase | null = null;

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  getMediaManagerUseCase(): MediaManagerUseCase {
    if (!this._mediaManagerUseCase) {
      // Repositories
      const folderRepository = new PrismaFolderRepository();
      const fileRepository = new PrismaFileRepository();

      // Domain Services
      const folderService = new FolderService(folderRepository);
      const fileService = new FileService(fileRepository, folderRepository);

      // Use Cases
      this._mediaManagerUseCase = new MediaManagerUseCase(folderService, fileService);
    }

    return this._mediaManagerUseCase;
  }
}