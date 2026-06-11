import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const rsvpRouter = Router();

// Pública (sem login): o convidado responde clicando no link do e-mail.
// GET /api/rsvp?token=...&status=ACEITO|RECUSADO
rsvpRouter.get('/', async (req, res) => {
  const { token, status } = req.query;
  const page = (msg) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Convite</title></head>`
    + `<body style="font-family:system-ui,sans-serif;background:#F5F7F8;color:#1F2933;display:flex;`
    + `min-height:100vh;align-items:center;justify-content:center;margin:0">`
    + `<div style="background:#fff;padding:32px 28px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:420px;text-align:center">${msg}</div>`
    + `</body></html>`;

  if (!token || !['ACEITO', 'RECUSADO'].includes(status)) {
    return res.status(400).send(page('<h2>Link inválido</h2><p>O link de resposta está incompleto.</p>'));
  }
  const guest = await prisma.eventGuest.findUnique({ where: { token }, include: { event: true } });
  if (!guest) {
    return res.status(404).send(page('<h2>Convite não encontrado</h2><p>Este convite pode ter sido removido.</p>'));
  }
  await prisma.eventGuest.update({ where: { id: guest.id }, data: { status } });
  const label = status === 'ACEITO' ? 'Presença confirmada ✅' : 'Convite recusado';
  res.send(page(`<h2>${label}</h2><p>Evento: <strong>${guest.event?.title || ''}</strong></p>`
    + `<p style="color:#52606D;font-size:14px">Sua resposta foi registrada. Você pode fechar esta página.</p>`));
});
