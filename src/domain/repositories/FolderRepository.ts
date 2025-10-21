import { Folder } from '../entities/Folder';

export interface FolderRepository {
  findById(id: string): Promise<Folder | null>;
  findByPath(userId: string, path: string): Promise<Folder | null>;
  findByParentId(parentId: string): Promise<Folder[]>;
  findRootFolder(userId: string): Promise<Folder | null>;
  findAllByUserId(userId: string): Promise<Folder[]>;
  create(folder: Folder): Promise<Folder>;
  update(folder: Folder): Promise<Folder>;
  delete(id: string): Promise<void>;
  exists(userId: string, path: string): Promise<boolean>;
}