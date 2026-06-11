import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, signToken, JWT_SECRET } from '../lib/auth.js';
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

// Devolve a URL de consentimento. O state é um JWT curto do usuário (callback chega sem auth).
googleRouter.get('/auth', authMiddleware, (req, res) => {
  if (!googleConfigured) return res.status(400).json({ error: 'Google não configurado no servidor' });
  const state = signToken(req.user); // assinado com JWT_SECRET; verificado no callback
  res.json({ url: getAuthUrl(state) });
});

// Callback do Google (navegação do browser, sem header de auth) — identifica via state.
googleRouter.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const appUrl = process.env.APP_URL || 'http://localhost:8081';
  try {
    const payload = jwt.verify(state, JWT_SECRET);
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
