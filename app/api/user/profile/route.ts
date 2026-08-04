import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/database/prisma';
import { requireAuthenticatedUser } from '@/src/lib/security';
import { auth as betterAuth } from '@/lib/auth';

export async function PUT(request: NextRequest) {

  try {
    const authentication = await requireAuthenticatedUser(request);
    if (authentication.response) return authentication.response;

    const body = await request.json();
    const { name, username, currentPassword, newPassword } = body;
    // Préparer les données de mise à jour
    const updateData: {
      name?: string;
      username?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // Validation et ajout du nom
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Le nom doit être une chaîne de caractères' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validation et ajout du username
    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' },
          { status: 400 }
        );
      }
      if (username.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères' },
          { status: 400 }
        );
      }
      // Validation des caractères autorisés (lettres, chiffres, tirets, underscores)
      if (!/^[\p{L}\p{N}_-]+$/u.test(username)) {
        return NextResponse.json(
          { success: false, error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores' },
          { status: 400 }
        );
      }

      // Vérifier si le username est déjà pris par un autre utilisateur
      const existingUser = await prisma.user.findFirst({
        where: {
            username: username.trim(),
            id: { not: authentication.user.id },
          },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Ce nom d\'utilisateur est déjà utilisé' },
          { status: 400 }
        );
      }

      updateData.username = username.trim();
    }

    // Gestion du changement de mot de passe
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Le mot de passe actuel est requis pour changer le mot de passe' },
          { status: 400 }
        );
      }

      if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
        return NextResponse.json(
          { success: false, error: 'Le nouveau mot de passe doit contenir entre 12 et 128 caractères' },
          { status: 400 }
        );
      }

      try {
        await betterAuth.api.changePassword({
          headers: request.headers,
          body: {
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
          },
        });
      } catch {
        return NextResponse.json(
          { success: false, error: 'Mot de passe actuel incorrect' },
          { status: 400 }
        );
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: authentication.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authentication = await requireAuthenticatedUser(request);
    if (authentication.response) return authentication.response;

    const user = await prisma.user.findUnique({
      where: { id: authentication.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}
