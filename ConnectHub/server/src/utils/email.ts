import nodemailer from 'nodemailer';
import { config } from '../config';

const isSmtpConfigured = !!(config.smtp.user && config.smtp.pass);

let transporter: nodemailer.Transporter | null = null;

if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    connectionTimeout: 5000,
  });
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  if (!transporter) return;
  const verificationUrl = `${config.clientUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject: 'Verify your ConnectHub account',
    html: `
      <h1>Welcome to ConnectHub!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#5865F2;color:#fff;text-decoration:none;border-radius:8px;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  if (!transporter) return;
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject: 'Reset your ConnectHub password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#5865F2;color:#fff;text-decoration:none;border-radius:8px;">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
}
