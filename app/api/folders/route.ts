import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '../../../src/DIContainer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'test-user-id';

    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    // Récupérer l'arborescence des dossiers directement
    const folders = await mediaManager.getFolderTree(userId);
    
    // Trouver le dossier racine dans la liste
    const rootFolder = folders.find(f => f.isRoot);
    
    if (!rootFolder) {
      return NextResponse.json({
        success: false,
        error: 'Aucun dossier racine trouvé pour cet utilisateur'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        rootFolder,
        folders
      }
    });
  } catch (error) {
    console.error('Error in folders API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parentId, userId } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { success: false, error: 'Name and userId are required' },
        { status: 400 }
      );
    }

    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    const folder = await mediaManager.createFolder({
      name,
      parentId,
      userId
    });

    return NextResponse.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}