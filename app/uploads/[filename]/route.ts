import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Rechercher le fichier dans la base de données par son nom physique
    // Le filename est maintenant l'ID du fichier + extension
    
    // TODO: Intégrer avec le service de domaine pour récupérer le fichier par nom
    // Pour l'instant, on cherche dans l'ancienne structure
    let filePath = path.join(process.cwd(), 'uploads', filename);
    
    // Si pas trouvé, chercher dans la nouvelle structure
    if (!existsSync(filePath)) {
      // Parcourir les dossiers d'utilisateurs
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const usersDir = path.join(uploadsDir, 'users');
      
      if (existsSync(usersDir)) {
        const { readdirSync } = await import('fs');
        const userFolders = readdirSync(usersDir);
        for (const userId of userFolders) {
          const userFilesDir = path.join(usersDir, userId, 'files');
          const testFilePath = path.join(userFilesDir, filename);
          if (existsSync(testFilePath)) {
            filePath = testFilePath;
            break;
          }
        }
      }
    }
    
    // Vérifier que le fichier existe
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Lire le fichier
    const fileBuffer = await readFile(filePath);
    
    // Déterminer le type MIME basé sur l'extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }

    // Retourner le fichier avec le bon Content-Type
    return new NextResponse(fileBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache 1 an
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}