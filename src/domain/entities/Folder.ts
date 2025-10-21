export class Folder {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly path: string,
    public readonly userId: string,
    public readonly parentId?: string,
    public readonly isRoot: boolean = false,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    this.validateName(name);
    this.validatePath(path);
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom du dossier ne peut pas être vide');
    }
    if (name.length > 255) {
      throw new Error('Le nom du dossier ne peut pas dépasser 255 caractères');
    }
    // Regex mise à jour pour accepter les caractères accentués et unicode
    if (!/^[\p{L}\p{N}\s\-_.]+$/u.test(name)) {
      throw new Error('Le nom du dossier contient des caractères non autorisés');
    }
  }

  private validatePath(path: string): void {
    if (!path || !path.startsWith('/')) {
      throw new Error('Le chemin doit commencer par /');
    }
  }

  public isChildOf(parentFolder: Folder): boolean {
    return this.parentId === parentFolder.id;
  }

  public getFullPath(): string {
    return this.path;
  }

  public canBeDeleted(): boolean {
    // Règles métier : un dossier racine ne peut pas être supprimé
    return !this.isRoot;
  }

  public static createRoot(userId: string): Folder {
    return new Folder(
      '', // L'ID sera généré par le repository
      'Racine',
      'root',
      '/',
      userId,
      undefined,
      true
    );
  }
}