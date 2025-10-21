import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    
    // Construire le chemin complet vers le fichier
    const fullPath = path.join(process.cwd(), 'uploads', filePath);
    
    // Vérifier que le fichier existe
    if (!existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Vérifier que le chemin ne contient pas de tentatives de traversal
    const normalizedPath = path.normalize(fullPath);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!normalizedPath.startsWith(uploadsDir)) {
      return new NextResponse('Access denied', { status: 403 });
    }

    // Lire le fichier
    const fileBuffer = await readFile(fullPath);
    
    // Déterminer le type MIME basé sur l'extension
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.zip': 'application/zip',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Créer la réponse avec les en-têtes appropriés
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache 1 an
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}