import { File, FileMetadata } from '../entities/File';
import { FileRepository } from '../repositories/FileRepository';
import { FolderRepository } from '../repositories/FolderRepository';
import crypto from 'crypto';
import sharp from 'sharp';

export interface UploadFileData {
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  folderId: string;
  userId: string;
  isPublic?: boolean;
}

export class FileService {
  constructor(
    private fileRepository: FileRepository,
    private folderRepository: FolderRepository
  ) {}

  async uploadFile(data: UploadFileData): Promise<File> {
    // Vérifier que le dossier existe et appartient à l'utilisateur
    const folder = await this.folderRepository.findById(data.folderId);
    if (!folder) {
      throw new Error('Dossier introuvable');
    }
    if (folder.userId !== data.userId) {
      throw new Error('Accès non autorisé au dossier');
    }

    // Calculer le checksum
    const checksum = crypto.createHash('md5').update(data.buffer).digest('hex');

    // Vérifier si le fichier existe déjà (par checksum)
    const existingFile = await this.fileRepository.findByChecksum(checksum);
    if (existingFile && existingFile.userId === data.userId) {
      throw new Error('Ce fichier existe déjà');
    }

    const slug = this.generateSlug(data.originalName.replace(/\.[^/.]+$/, ""));
    
    // Générer un nom temporaire pour la création initiale
    const timestamp = Date.now();
    const tempName = `${timestamp}-temp`;
    const extension = this.getFileExtension(data.originalName);
    
    // Construire le chemin temporaire
    const tempPath = folder.path === '/' ? `/${tempName}${extension}` : `${folder.path}/${tempName}${extension}`;
    
    // Créer le fichier avec un nom temporaire
    const tempFile = new File(
      '', // L'ID sera généré par le repository
      `${tempName}${extension}`,
      data.originalName,
      slug,
      data.mimeType,
      data.buffer.length,
      tempPath,
      checksum,
      data.userId,
      data.folderId,
      data.isPublic || false,
      `/uploads/users/${data.userId}/files/${tempName}${extension}`,
      await this.extractMetadata(data.buffer, data.mimeType)
    );

    // Sauvegarder pour obtenir l'ID
    const savedFile = await this.fileRepository.create(tempFile);
    
    // Générer le nom physique final avec l'ID
    const physicalName = `${savedFile.id}${extension}`;
    const finalPath = folder.path === '/' ? `/${physicalName}` : `${folder.path}/${physicalName}`;
    const finalUrl = `/uploads/users/${data.userId}/files/${physicalName}`;

    // Mettre à jour le fichier avec les informations finales
    const finalFile = new File(
      savedFile.id,
      physicalName,
      data.originalName,
      slug,
      data.mimeType,
      data.buffer.length,
      finalPath,
      checksum,
      data.userId,
      data.folderId,
      data.isPublic || false,
      finalUrl,
      savedFile.metadata,
      savedFile.createdAt,
      new Date()
    );

    // Mettre à jour le fichier avec les informations finales
    return await this.fileRepository.update(finalFile);
  }

  async getFilesByFolder(folderId: string, userId: string): Promise<File[]> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) {
      throw new Error('Dossier introuvable');
    }
    if (folder.userId !== userId) {
      throw new Error('Accès non autorisé');
    }

    return await this.fileRepository.findByFolderId(folderId);
  }

  async getFileById(fileId: string): Promise<File | null> {
    return await this.fileRepository.findById(fileId);
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new Error('Fichier introuvable');
    }
    if (file.userId !== userId) {
      throw new Error('Accès non autorisé');
    }

    await this.fileRepository.delete(fileId);
  }

  async getPublicFiles(): Promise<File[]> {
    return await this.fileRepository.findPublicFiles();
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async extractMetadata(buffer: Buffer, mimeType: string): Promise<FileMetadata | undefined> {
    if (!mimeType.startsWith('image/')) {
      return undefined;
    }

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction des métadonnées:', error);
      return undefined;
    }
  }


}