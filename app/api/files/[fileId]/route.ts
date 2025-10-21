import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '../../../../src/DIContainer';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    // Récupérer les informations du fichier avant suppression
    const file = await mediaManager.getFileById(fileId);
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Construire les chemins des fichiers physiques
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const userFilesDir = path.join(uploadsDir, 'users', file.userId, 'files');
    const userThumbsDir = path.join(uploadsDir, 'users', file.userId, 'thumbs');
    
    const originalFilePath = path.join(userFilesDir, file.name);
    const extension = path.extname(file.name);
    const fileIdWithoutExt = file.name.replace(extension, '');
    
    // Chemins des miniatures
    const smallThumbPath = path.join(userThumbsDir, `${fileIdWithoutExt}-small.jpg`);
    const mediumThumbPath = path.join(userThumbsDir, `${fileIdWithoutExt}-medium.jpg`);

    // Supprimer de la base de données d'abord
    await mediaManager.deleteFile(fileId, file.userId);

    // Supprimer le fichier original s'il existe
    if (existsSync(originalFilePath)) {
      await unlink(originalFilePath);
    }

    // Supprimer les miniatures si elles existent
    if (existsSync(smallThumbPath)) {
      await unlink(smallThumbPath);
    }
    
    if (existsSync(mediumThumbPath)) {
      await unlink(mediumThumbPath);
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Erreur lors de la suppression du fichier:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}