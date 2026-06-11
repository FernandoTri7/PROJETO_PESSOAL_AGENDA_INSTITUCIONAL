import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import { validateBody } from '../lib/validate.js';
import { registerSchema, loginSchema } from '../lib/schemas.js';

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

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}
