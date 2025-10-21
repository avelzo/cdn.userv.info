export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
}

export class File {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly originalName: string,
    public readonly slug: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly path: string,
    public readonly checksum: string,
    public readonly userId: string,
    public readonly folderId: string,
    public readonly isPublic: boolean = false,
    public readonly url?: string,
    public readonly metadata?: FileMetadata,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    this.validateFileName(name);
    this.validateMimeType(mimeType);
    this.validateSize(size);
  }

  private validateFileName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom du fichier ne peut pas être vide');
    }
    if (name.length > 255) {
      throw new Error('Le nom du fichier ne peut pas dépasser 255 caractères');
    }
    // Validation plus permissive pour les noms de fichiers
  }

  private validateMimeType(mimeType: string): void {
    if (!mimeType || !mimeType.includes('/')) {
      throw new Error('Type MIME invalide');
    }
  }

  private validateSize(size: number): void {
    if (size < 0) {
      throw new Error('La taille du fichier doit être positive');
    }
    // Limite à 100MB par défaut
    if (size > 100 * 1024 * 1024) {
      throw new Error('Le fichier dépasse la taille maximale autorisée (100MB)');
    }
  }

  public isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  public isVideo(): boolean {
    return this.mimeType.startsWith('video/');
  }

  public isAudio(): boolean {
    return this.mimeType.startsWith('audio/');
  }

  public isDocument(): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    return documentTypes.includes(this.mimeType);
  }

  public getFileExtension(): string {
    const parts = this.name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  public getFormattedSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}