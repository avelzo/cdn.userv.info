import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/src/infrastructure/database/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, username, currentPassword, newPassword } = body;

    // Préparer les données de mise à jour
    const updateData: {
      name?: string;
      username?: string;
      password?: string;
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
          id: { not: session.user.id },
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

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
          { status: 400 }
        );
      }

      // Récupérer l'utilisateur avec son mot de passe actuel
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }

      // Vérifier le mot de passe actuel
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Mot de passe actuel incorrect' },
          { status: 400 }
        );
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
