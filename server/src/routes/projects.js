// Gestão de projetos e vínculos da identidade central.
// "Meus projetos", habilitar/desabilitar pessoas por projeto, trocar papel e
// transferência de gestão (regra do GESTOR). Ver docs/arquitetura-identidade-central.md
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../lib/validate.js';
import { isElevatedRole } from '../lib/auth.js';
import {
  projectCreateSchema,
  projectMemberAddSchema,
  projectMemberUpdateSchema,
  transferOwnershipSchema,
} from '../lib/schemas.js';
import * as svc from '../lib/projects.js';

export const projectsRouter = Router();

function memberView(m) {
  return {
    userId: m.userId,
    role: m.role,
    active: m.active,
    user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email, kind: m.user.kind } : undefined,
  };
}

// GET /api/projects — projetos em que o usuário tem vínculo ATIVO ("meus projetos").
projectsRouter.get('/', async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id, active: true, project: { active: true } },
    include: { project: true },
    orderBy: { joinedAt: 'asc' },
  });
  res.json(
    memberships.map((m) => ({
      key: m.project.key,
      name: m.project.name,
      role: m.role,
      isOwner: m.project.ownerUserId === req.user.id,
    }))
  );
});

// POST /api/projects — cria um projeto; o criador vira GESTOR (owner).
projectsRouter.post('/', validateBody(projectCreateSchema), async (req, res) => {
  const { key, name } = req.body;
  const exists = await prisma.project.findUnique({ where: { key } });
  if (exists) return res.status(409).json({ error: 'Já existe um projeto com essa key' });

  const project = await prisma.project.create({
    data: {
      key,
      name,
      ownerUserId: req.user.id,
      memberships: { create: { userId: req.user.id, role: 'GESTOR' } },
    },
  });
  res.status(201).json({ key: project.key, name: project.name, role: 'GESTOR', isOwner: true });
});

// Middleware: resolve o projeto da URL e exige que o usuário seja elevado (GESTOR/ADMIN) NELE.
// (Independe do projeto ativo do header — a autorização é sobre o projeto-alvo da rota.)
async function requireProjectElevated(req, res, next) {
  const project = await svc.getProjectByKey(req.params.key); // lança DomainError 404 se não existir
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.user.id, projectId: project.id } },
  });
  if (!membership || !membership.active || !isElevatedRole(membership.role)) {
    return res.status(403).json({ error: 'Apenas gestor/admin do projeto podem gerenciá-lo' });
  }
  req.targetProject = project;
  next();
}

// GET /api/projects/:key/members — lista os vínculos do projeto (elevado).
projectsRouter.get('/:key/members', requireProjectElevated, async (req, res) => {
  const members = await svc.listMembers(req.targetProject.id);
  res.json({ ownerUserId: req.targetProject.ownerUserId, members: members.map(memberView) });
});

// POST /api/projects/:key/members — habilita um usuário existente no projeto (elevado).
projectsRouter.post('/:key/members', requireProjectElevated, validateBody(projectMemberAddSchema), async (req, res) => {
  const m = await svc.addOrEnableMember(req.targetProject.id, req.body.email, req.body.role || 'MEMBRO');
  res.status(201).json(memberView(m));
});

// PATCH /api/projects/:key/members/:userId — muda papel e/ou ativa/desativa (elevado).
projectsRouter.patch('/:key/members/:userId', requireProjectElevated, validateBody(projectMemberUpdateSchema), async (req, res) => {
  const { userId } = req.params;
  let m;
  if (req.body.role !== undefined) m = await svc.setMemberRole(req.targetProject, userId, req.body.role);
  if (req.body.active !== undefined) m = await svc.setMemberActive(req.targetProject, userId, req.body.active);
  res.json(memberView(m));
});

// POST /api/projects/:key/transfer-ownership — transfere a gestão (elevado: gestor atual ou admin).
projectsRouter.post('/:key/transfer-ownership', requireProjectElevated, validateBody(transferOwnershipSchema), async (req, res) => {
  let newOwnerUserId = req.body.userId;
  if (!newOwnerUserId && req.body.email) {
    const u = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!u) return res.status(404).json({ error: 'Usuário do novo gestor não encontrado' });
    newOwnerUserId = u.id;
  }
  const project = await svc.transferOwnership(req.targetProject, newOwnerUserId);
  res.json({ key: project.key, ownerUserId: project.ownerUserId });
});
