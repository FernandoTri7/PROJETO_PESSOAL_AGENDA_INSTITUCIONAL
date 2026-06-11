import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken, authMiddleware } from '../lib/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import { validateBody } from '../lib/validate.js';
import { registerSchema, loginSchema, prefsSchema } from '../lib/schemas.js';

const DEFAULT_PREFS = { notificationsEnabled: false, useInstitutional: true };
function parsePrefs(raw) {
  try { return { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) }; }
  catch { return { ...DEFAULT_PREFS }; }
}

export const authRouter = Router();

// Protege login e cadastro contra brute force: 10 tentativas por IP a cada 15 min.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

authRouter.post('/register', loginLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

  const count = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      // primeiro usuário do sistema vira ADMIN
      role: count === 0 ? 'ADMIN' : 'MEMBRO',
    },
  });
  // agenda pessoal padrão
  const cal = await prisma.calendar.create({
    data: {
      name: 'Minha Agenda',
      type: 'PESSOAL',
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  });
  res.json({ token: signToken(user), user: publicUser(user), defaultCalendarId: cal.id });
});

authRouter.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email || '' } });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }
  if (!user.active) return res.status(403).json({ error: 'Usuário desativado' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

// Perfil do usuário autenticado + preferências.
authRouter.get('/me', authMiddleware, async (req, res) => {
  res.json({ ...publicUser(req.user), prefs: parsePrefs(req.user.prefs) });
});

// Atualiza preferências (merge sobre as existentes).
authRouter.put('/me/prefs', authMiddleware, validateBody(prefsSchema), async (req, res) => {
  const merged = { ...parsePrefs(req.user.prefs), ...req.body };
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { prefs: JSON.stringify(merged) },
  });
  res.json({ ...publicUser(user), prefs: parsePrefs(user.prefs) });
});

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}
