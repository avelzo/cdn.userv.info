import nodemailer from 'nodemailer';

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    console.log('Right before sendemail');
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@cdn.userv.info',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log('Email envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
}

export function generateResetPasswordEmail(name: string, resetUrl: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Réinitialisation de votre mot de passe</h1>
        </div>
        <div class="content">
          <p>Bonjour ${name || 'utilisateur'},</p>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>CDN-USERV</strong>.</p>
          
          <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </p>
          
          <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
          
          <p><strong>⚠️ Important :</strong></p>
          <ul>
            <li>Ce lien expire dans <strong>1 heure</strong></li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            <li>Votre mot de passe actuel reste inchangé tant que vous ne cliquez pas sur le lien</li>
          </ul>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé depuis CDN-USERV<br>
          Si vous avez des questions, contactez le support.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Réinitialisation de votre mot de passe - CDN-USERV

    Bonjour ${name || 'utilisateur'},

    Vous avez demandé la réinitialisation de votre mot de passe sur CDN-USERV.

    Cliquez sur ce lien pour définir un nouveau mot de passe :
    ${resetUrl}

    ⚠️ Important :
    - Ce lien expire dans 1 heure
    - Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
    - Votre mot de passe actuel reste inchangé tant que vous ne cliquez pas sur le lien

    Cet email a été envoyé depuis CDN-USERV
  `;

  return { html, text };
}