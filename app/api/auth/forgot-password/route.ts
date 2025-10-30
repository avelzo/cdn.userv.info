import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/infrastructure/database/prisma';
import { sendEmail, generateResetPasswordEmail } from '../../../../src/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validation de l'email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    console.log('User found for forgot-password:', user);
    // Pour des raisons de sécurité, on renvoie toujours le même message
    // même si l'utilisateur n'existe pas
    const successMessage = 'Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.';

    if (!user) {
      // Attendre un délai aléatoire pour éviter l'énumération des comptes
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      return NextResponse.json({ message: successMessage });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Expire dans 1 heure

    // Sauvegarder le token en base
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Générer l'URL de réinitialisation
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    console.log('Reset URL generated:', resetUrl);
    // Préparer l'email
    const { html, text } = generateResetPasswordEmail(user.name || user.email, resetUrl);

    console.log('Email content prepared:', { html, text }   );
    // Envoyer l'email
    const emailSent = await sendEmail({
      to: user.email,
      subject: '🔐 Réinitialisation de votre mot de passe - CDN-USERV',
      html,
      text
    });

    if (!emailSent) {
      console.error('Échec envoi email pour:', user.email);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer plus tard.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: successMessage });

  } catch (error) {
    console.error('Erreur forgot-password:', error);
    return NextResponse.json(
      { error: 'Erreur serveur. Veuillez réessayer plus tard.' },
      { status: 500 }
    );
  }
}