import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '../../../../src/DIContainer';

export async function PUT(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { name, userId } = await request.json();

    if (!name || !userId) {
      return NextResponse.json(
        { success: false, error: 'Name and userId are required' },
        { status: 400 }
      );
    }

    if (!name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le nom du dossier ne peut pas être vide' },
        { status: 400 }
      );
    }

    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    const updatedFolder = await mediaManager.renameFolder(params.folderId, name.trim(), userId);

    return NextResponse.json({
      success: true,
      data: updatedFolder,
      message: 'Dossier renommé avec succès'
    });
  } catch (error) {
    console.error('Error renaming folder:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UserId is required' },
        { status: 400 }
      );
    }

    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    // Vérifier si le dossier contient des fichiers ou des sous-dossiers
    const { folders, files } = await mediaManager.getFolderContents(params.folderId, userId);
    
    if (folders.length > 0 || files.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Le dossier n\'est pas vide. Il contient des fichiers ou des sous-dossiers.',
          isEmpty: false
        },
        { status: 400 }
      );
    }

    await mediaManager.deleteFolder(params.folderId, userId);

    return NextResponse.json({
      success: true,
      message: 'Dossier supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}