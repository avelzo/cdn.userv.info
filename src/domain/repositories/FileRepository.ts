import { File } from '../entities/File';

export interface FileRepository {
  findById(id: string): Promise<File | null>;
  findByPath(userId: string, path: string): Promise<File | null>;
  findByFolderId(folderId: string): Promise<File[]>;
  findByUserId(userId: string): Promise<File[]>;
  findByChecksum(checksum: string): Promise<File | null>;
  create(file: File): Promise<File>;
  update(file: File): Promise<File>;
  delete(id: string): Promise<void>;
  exists(userId: string, path: string): Promise<boolean>;
  findPublicFiles(): Promise<File[]>;
}