import { Folder } from '../entities/Folder';
import { FolderRepository } from '../repositories/FolderRepository';

export class FolderService {
  constructor(private folderRepository: FolderRepository) {}

  async createFolder(
    name: string,
    parentId: string | undefined,
    userId: string
  ): Promise<Folder> {
    // Générer le slug
    const slug = this.generateSlug(name);
    
    // Construire le chemin
    let path = '/';
    if (parentId) {
      const parentFolder = await this.folderRepository.findById(parentId);
      if (!parentFolder) {
        throw new Error('Dossier parent introuvable');
      }
      if (parentFolder.userId !== userId) {
        throw new Error('Accès non autorisé au dossier parent');
      }
      path = parentFolder.path === '/' ? `/${slug}` : `${parentFolder.path}/${slug}`;
    } else {
      path = `/${slug}`;
    }

    // Vérifier que le chemin n'existe pas déjà
    if (await this.folderRepository.exists(userId, path)) {
      throw new Error('Un dossier avec ce nom existe déjà à cet emplacement');
    }

    const folder = new Folder(
      '', // L'ID sera généré par le repository
      name,
      slug,
      path,
      userId,
      parentId
    );

    return await this.folderRepository.create(folder);
  }

  async getFolderTree(userId: string): Promise<Folder[]> {
    return await this.folderRepository.findAllByUserId(userId);
  }

  async getFolderContents(folderId: string, userId: string): Promise<Folder[]> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) {
      throw new Error('Dossier introuvable');
    }
    if (folder.userId !== userId) {
      throw new Error('Accès non autorisé');
    }

    return await this.folderRepository.findByParentId(folderId);
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) {
      throw new Error('Dossier introuvable');
    }
    if (folder.userId !== userId) {
      throw new Error('Accès non autorisé');
    }
    if (!folder.canBeDeleted()) {
      throw new Error('Ce dossier ne peut pas être supprimé');
    }

    // Vérifier qu'il n'y a pas de sous-dossiers
    const children = await this.folderRepository.findByParentId(folderId);
    if (children.length > 0) {
      throw new Error('Impossible de supprimer un dossier non vide');
    }

    await this.folderRepository.delete(folderId);
  }

  async ensureRootFolder(userId: string): Promise<Folder> {
    let rootFolder = await this.folderRepository.findRootFolder(userId);
    if (!rootFolder) {
      const folder = Folder.createRoot(userId);
      rootFolder = await this.folderRepository.create(folder);
    }
    return rootFolder;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}