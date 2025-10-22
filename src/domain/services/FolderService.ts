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

  async renameFolder(folderId: string, newName: string, userId: string): Promise<Folder> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) {
      throw new Error('Dossier introuvable');
    }
    if (folder.userId !== userId) {
      throw new Error('Accès non autorisé');
    }
    if (!folder.canBeRenamed()) {
      throw new Error('Ce dossier ne peut pas être renommé');
    }

    // Générer le nouveau slug
    const newSlug = this.generateSlug(newName);
    
    // Construire le nouveau chemin
    let newPath = '/';
    if (folder.parentId) {
      const parentFolder = await this.folderRepository.findById(folder.parentId);
      if (!parentFolder) {
        throw new Error('Dossier parent introuvable');
      }
      newPath = parentFolder.path === '/' ? `/${newSlug}` : `${parentFolder.path}/${newSlug}`;
    } else {
      newPath = `/${newSlug}`;
    }

    // Vérifier que le nouveau chemin n'existe pas déjà (sauf si c'est le même dossier)
    if (newPath !== folder.path && await this.folderRepository.exists(userId, newPath)) {
      throw new Error('Un dossier avec ce nom existe déjà à cet emplacement');
    }

    // Créer le nouveau dossier avec les informations mises à jour
    const updatedFolder = new Folder(
      folder.id,
      newName,
      newSlug,
      newPath,
      folder.userId,
      folder.parentId,
      folder.isRoot,
      folder.createdAt,
      new Date() // updatedAt
    );

    return await this.folderRepository.update(updatedFolder);
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