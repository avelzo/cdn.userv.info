import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; thumbnail: string }> }
) {
  try {
    const { userId, thumbnail } = await params;
    
    if (!userId || !thumbnail) {
      return NextResponse.json(
        { error: 'UserId and thumbnail name are required' },
        { status: 400 }
      );
    }

    // Chemin sécurisé vers la miniature
    const thumbnailPath = path.join(process.cwd(), 'uploads', 'users', userId, 'thumbs', thumbnail);
    
    // Vérifier que la miniature existe
    if (!existsSync(thumbnailPath)) {
      return NextResponse.json(
        { error: 'Thumbnail not found' },
        { status: 404 }
      );
    }

    // Lire la miniature
    const thumbnailBuffer = await readFile(thumbnailPath);
    
    // Les miniatures sont toujours en JPEG
    const contentType = 'image/jpeg';

    // Retourner la miniature avec le bon Content-Type
    return new NextResponse(thumbnailBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': thumbnailBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache 1 an
      },
    });

  } catch (error) {
    console.error('Error serving thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}