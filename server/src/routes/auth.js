import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken, authMiddleware } from '../lib/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import { validateBody } from '../lib/validate.js';
import { registerSchema, loginSchema, prefsSchema } from '../lib/schemas.js';

const DEFAULT_PREFS = { notificationsEnabled: false, useInstitutional: true, hiddenCalendarIds: [] };
function parsePrefs(raw) {
  try { return { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) }; }
  catch { return { ...DEFAULT_PREFS }; }
}

export const authRouter = Router();

// Protege login e cadastro contra brute force: 10 tentativas por IP a cada 15 min.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

// Status de primeira execução: indica se o sistema ainda não tem nenhum usuário.
// A tela de login usa isto para oferecer o cadastro inicial do administrador.
authRouter.get('/setup', async (_req, res) => {
  const count = await prisma.user.count();
  res.json({ needsSetup: count === 0 });
});

authRouter.post('/register', loginLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

  const count = await prisma.user.count();
  const isFirst = count === 0; // primeiro usuário do sistema vira GESTOR do projeto agenda
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      // [LEGADO] role global em coexistência; o papel real vai para Membership (abaixo). Removido na Fase 3.
      role: isFirst ? 'ADMIN' : 'MEMBRO',
    },
  });

  // Identidade central: garante o projeto "agenda" e vincula o usuário (GESTOR no 1º cadastro, MEMBRO depois).
  const projectRole = isFirst ? 'GESTOR' : 'MEMBRO';
  const project = await prisma.project.upsert({
    where: { key: 'agenda' },
    update: {},
    create: { key: 'agenda', name: 'Agenda Institucional', ownerUserId: user.id },
  });
  if (isFirst && !project.ownerUserId) {
    await prisma.project.update({ where: { id: project.id }, data: { ownerUserId: user.id } });
  }
  await prisma.membership.create({
    data: { userId: user.id, projectId: project.id, role: projectRole },
  });

  // Agenda pessoal padrão para todo usuário.
  const cal = await prisma.calendar.create({
    data: {
      name: 'Minha Agenda',
      type: 'PESSOAL',
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  });
  // No cadastro inicial do gestor, já cria a Agenda Institucional do sistema.
  if (isFirst) {
    await prisma.calendar.create({
      data: {
        name: 'Agenda Institucional',
        type: 'INSTITUCIONAL',
        color: '#0b8043',
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    });
  }
  res.json({ token: signToken(user), user: publicUser(user, projectRole), defaultCalendarId: cal.id });
});

authRouter.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email || '' } });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }
  if (!user.active) return res.status(403).json({ error: 'Usuário desativado' });
  // Papel no projeto agenda (fallback para a role legada enquanto não houver vínculo).
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, active: true, project: { key: 'agenda', active: true } },
    select: { role: true },
  });
  res.json({ token: signToken(user), user: publicUser(user, membership?.role) });
});

// Perfil do usuário autenticado + preferências.
authRouter.get('/me', authMiddleware, async (req, res) => {
  res.json({ ...publicUser(req.user, req.membership?.role), prefs: parsePrefs(req.user.prefs) });
});

// Atualiza preferências (merge sobre as existentes).
authRouter.put('/me/prefs', authMiddleware, validateBody(prefsSchema), async (req, res) => {
  const merged = { ...parsePrefs(req.user.prefs), ...req.body };
  // Usuário comum não pode ocultar a agenda institucional: removemos esses ids da lista.
  if (!req.isElevated && Array.isArray(merged.hiddenCalendarIds) && merged.hiddenCalendarIds.length) {
    const inst = await prisma.calendar.findMany({
      where: { id: { in: merged.hiddenCalendarIds }, type: 'INSTITUCIONAL' },
      select: { id: true },
    });
    const instIds = new Set(inst.map((c) => c.id));
    merged.hiddenCalendarIds = merged.hiddenCalendarIds.filter((id) => !instIds.has(id));
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { prefs: JSON.stringify(merged) },
  });
  res.json({ ...publicUser(user), prefs: parsePrefs(user.prefs) });
});

// `role` retornado ao cliente é o papel NO PROJETO atual (Membership.role); na ausência de
// vínculo, cai na role legada do usuário. Assim a UI reflete a autorização real do backend.
function publicUser(u, projectRole) {
  return { id: u.id, name: u.name, email: u.email, role: projectRole || u.role };
}
