import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, JWT_SECRET } from '../lib/auth.js';
import { googleConfigured, getAuthUrl, exchangeCodeAndSave, freshAccessToken } from '../lib/google.js';

export const googleRouter = Router();

// Situação da conexão Google do usuário + dados públicos p/ o Picker (clientId/apiKey).
googleRouter.get('/status', authMiddleware, async (req, res) => {
  const acc = await prisma.googleAccount.findUnique({ where: { userId: req.user.id } });
  res.json({
    configured: googleConfigured,
    connected: !!acc,
    email: acc?.email || null,
    apiKey: process.env.GOOGLE_API_KEY || null,
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// Devolve a URL de consentimento. O state é um JWT curto com o usuário e a origem do app
// (assim o callback redireciona de volta para a porta certa, sem depender de APP_URL fixo).
googleRouter.get('/auth', authMiddleware, (req, res) => {
  if (!googleConfigured) return res.status(400).json({ error: 'Google não configurado no servidor' });
  let origin = req.headers.origin || null;
  if (!origin && req.headers.referer) { try { origin = new URL(req.headers.referer).origin; } catch { /* ignora */ } }
  const state = jwt.sign({ sub: req.user.id, origin }, JWT_SECRET, { expiresIn: '10m' });
  res.json({ url: getAuthUrl(state) });
});

// Callback do Google (navegação do browser, sem header de auth) — identifica via state.
googleRouter.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  let appUrl = process.env.APP_URL || 'http://localhost:8081';
  try {
    const payload = jwt.verify(state, JWT_SECRET);
    if (payload.origin) appUrl = payload.origin;
    await exchangeCodeAndSave(payload.sub, code);
    return res.redirect(`${appUrl}/more?google=ok`);
  } catch {
    return res.redirect(`${appUrl}/more?google=erro`);
  }
});

// Access token válido para o Google Picker (frontend) selecionar arquivos do Drive.
googleRouter.get('/token', authMiddleware, async (req, res) => {
  const token = await freshAccessToken(req.user.id);
  if (!token) return res.status(400).json({ error: 'Conta Google não conectada' });
  res.json({ accessToken: token, apiKey: process.env.GOOGLE_API_KEY || null });
});

// Desconectar a conta Google.
googleRouter.delete('/', authMiddleware, async (req, res) => {
  await prisma.googleAccount.deleteMany({ where: { userId: req.user.id } });
  res.json({ ok: true });
});
