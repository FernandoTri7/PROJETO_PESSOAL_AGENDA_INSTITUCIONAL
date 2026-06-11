// Envio de e-mail via nodemailer. Sem SMTP configurado, vira no-op (apenas loga),
// para o desenvolvimento seguir funcionando sem credenciais.
import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

export const mailConfigured = !!SMTP_HOST;

let transport = null;
if (mailConfigured) {
  const port = Number(SMTP_PORT) || 587;
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = TLS implícito; 587/25 = STARTTLS
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

// Retorna { sent: boolean }. Quando SMTP não está configurado, não lança — apenas loga.
export async function sendMail({ to, subject, text, html, icsContent }) {
  if (!transport) {
    logger.info({ to, subject }, 'SMTP não configurado — e-mail simulado (não enviado)');
    return { sent: false };
  }
  const attachments = icsContent
    ? [{ filename: 'evento.ics', content: icsContent, contentType: 'text/calendar; method=REQUEST' }]
    : [];
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, text, html, attachments });
  return { sent: true };
}
