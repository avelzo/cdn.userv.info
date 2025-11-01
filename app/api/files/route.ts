import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '../../../src/DIContainer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const userId = searchParams.get('userId');

    if (!folderId || !userId) {
      return NextResponse.json(
        { success: false, error: 'folderId and userId are required' },
        { status: 400 }
      );
    }

    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    // Récupération du contenu du dossier (dossiers + fichiers)
    const content = await mediaManager.getFolderContents(folderId, userId);

    return NextResponse.json({
      success: true,
      data: {
        folders: content.folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          path: folder.path,
          parentId: folder.parentId,
          isRoot: folder.isRoot,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          userId: folder.userId
        })),
        files: content.files.map(file => ({
          id: file.id,
          name: file.name,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          path: file.path,
          url: file.url,
          isPublic: file.isPublic,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          folderId: file.folderId,
          metadata: file.metadata ? {
            width: file.metadata.width,
            height: file.metadata.height,
            duration: file.metadata.duration,
            bitrate: file.metadata.bitrate,
            format: file.metadata.format,
          } : null,
        }))
      }
    });

    } catch (error: unknown) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch folder contents';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}