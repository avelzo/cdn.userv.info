import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '../../../../src/DIContainer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const userId = formData.get('userId') as string;
    const isPublic = formData.get('isPublic') === 'true';

    if (!file || !folderId || !userId) {
      return NextResponse.json(
        { success: false, error: 'File, folderId and userId are required' },
        { status: 400 }
      );
    }

    // Validation de la taille du fichier (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Conversion du fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Utiliser le service de domaine pour enregistrer en base
    const mediaManager = DIContainer.getInstance().getMediaManagerUseCase();
    
    const uploadedFile = await mediaManager.uploadFile({
      originalName: file.name,
      buffer: buffer,
      mimeType: file.type,
      folderId: folderId,
      userId: userId,
      isPublic: isPublic
    });

    // Créer la structure de dossiers: /uploads/users/{userId}/files/
    const userUploadsDir = path.join(uploadsDir, 'users', userId, 'files');
    if (!existsSync(userUploadsDir)) {
      await mkdir(userUploadsDir, { recursive: true });
    }

    // Sauvegarder le fichier avec le nom physique (ID + extension)
    const finalFilePath = path.join(userUploadsDir, uploadedFile.name);
    await writeFile(finalFilePath, buffer);

    // Générer les miniatures si c'est une image
    if (file.type.startsWith('image/')) {
      try {
        const sharp = (await import('sharp')).default;
        const image = sharp(buffer);
        
        // Créer le dossier des miniatures
        const thumbsDir = path.join(uploadsDir, 'users', userId, 'thumbs');
        if (!existsSync(thumbsDir)) {
          await mkdir(thumbsDir, { recursive: true });
        }

        // Générer différentes tailles de miniatures
        const sizes = [
          { name: 'small', width: 150, height: 150 },
          { name: 'medium', width: 300, height: 300 }
        ];

        for (const size of sizes) {
          const thumbnailBuffer = await image
            .resize(size.width, size.height, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          const fileIdWithoutExt = uploadedFile.name.replace(path.extname(uploadedFile.name), '');
          const thumbnailPath = path.join(thumbsDir, `${fileIdWithoutExt}-${size.name}.jpg`);
          await writeFile(thumbnailPath, thumbnailBuffer);
        }
      } catch (error) {
        console.error('Erreur lors de la génération des miniatures:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        originalName: uploadedFile.originalName,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size,
        path: uploadedFile.path,
        url: uploadedFile.url,
        isPublic: uploadedFile.isPublic,
        createdAt: uploadedFile.createdAt,
        folderId: uploadedFile.folderId
      }
    });

    } catch (error: unknown) {
    console.error('Erreur lors de l\'upload du fichier:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}