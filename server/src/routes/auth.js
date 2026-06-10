import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Informe nome, e-mail e senha' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
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

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
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
