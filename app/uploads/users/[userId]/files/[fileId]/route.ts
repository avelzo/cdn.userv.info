import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; fileId: string }> }
) {
  try {
    const { userId, fileId } = await params;
    
    if (!userId || !fileId) {
      return NextResponse.json(
        { error: 'UserId and fileId are required' },
        { status: 400 }
      );
    }

    // Chemin sécurisé vers le fichier dans la nouvelle structure
    const filePath = path.join(process.cwd(), 'uploads', 'users', userId, 'files', fileId);
    
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
    const ext = path.extname(fileId).toLowerCase();
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