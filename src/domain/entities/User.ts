export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly username: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    this.validateEmail(email);
    this.validateUsername(username);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Adresse email invalide');
    }
  }

  private validateUsername(username: string): void {
    if (!username || username.length < 3) {
      throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    }
    if (username.length > 50) {
      throw new Error('Le nom d\'utilisateur ne peut pas dépasser 50 caractères');
    }
    // Validation plus permissive pour les usernames
    if (!/^[\p{L}\p{N}_-]+$/u.test(username)) {
      throw new Error('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores');
    }
  }

  public canAccessFolder(folder: { userId: string }): boolean {
    return folder.userId === this.id;
  }

  public canAccessFile(file: { userId: string; isPublic?: boolean }): boolean {
    return file.userId === this.id || Boolean(file.isPublic);
  }
}