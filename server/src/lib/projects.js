// Serviço de identidade central: gestão de projetos e vínculos (Membership).
// Concentra as invariantes da regra do GESTOR para que rotas e testes compartilhem a mesma lógica.
// Ver docs/arquitetura-identidade-central.md (§7).
import { prisma } from './prisma.js';

export const PROJECT_ROLES = ['VISITANTE', 'MEMBRO', 'ADMIN', 'GESTOR'];
const ROLE_ORDER = { VISITANTE: 0, MEMBRO: 1, ADMIN: 2, GESTOR: 3 };

export function roleRank(role) {
  return ROLE_ORDER[role] ?? -1;
}

// Erro de domínio com `status` HTTP, para a rota responder sem conhecer as regras.
export class DomainError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ─────────── Invariantes puras (testáveis sem banco) ───────────

// O gestor atual de um projeto não pode ter o papel alterado nem ser desativado
// por uma operação comum — só sai do posto via transferência de gestão.
export function assertNotTouchingOwner(project, userId, op) {
  if (project.ownerUserId && project.ownerUserId === userId) {
    throw new DomainError(409, `O gestor do projeto não pode ser ${op} diretamente — use a transferência de gestão.`);
  }
}

export function assertValidRole(role) {
  if (!PROJECT_ROLES.includes(role)) {
    throw new DomainError(422, `Papel inválido: ${role}. Use um de ${PROJECT_ROLES.join(', ')}.`);
  }
}

// GESTOR só é atribuído via transferência (mantém a invariante "um gestor por projeto").
export function assertNotAssigningGestor(role) {
  if (role === 'GESTOR') {
    throw new DomainError(409, 'Para tornar alguém GESTOR use a transferência de gestão, não a edição de papel.');
  }
}

// ─────────── Operações (com banco) ───────────

export async function getProjectByKey(key) {
  const project = await prisma.project.findUnique({ where: { key } });
  if (!project) throw new DomainError(404, 'Projeto não encontrado');
  return project;
}

export async function listMembers(projectId) {
  return prisma.membership.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, kind: true, associadoId: true,
          associado: { select: { id: true, nome: true, grau: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

// Vincula (ou desvincula, com associadoId=null) uma conta de login a um Associado.
// Um Associado só pode estar ligado a um usuário (User.associadoId é @unique).
export async function setMemberAssociado(userId, associadoId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new DomainError(404, 'Usuário não encontrado');
  if (associadoId) {
    const assoc = await prisma.associado.findUnique({ where: { id: associadoId }, include: { user: true } });
    if (!assoc) throw new DomainError(404, 'Associado não encontrado');
    if (assoc.user && assoc.user.id !== userId) {
      throw new DomainError(409, 'Este associado já está vinculado a outro usuário.');
    }
  }
  return prisma.user.update({ where: { id: userId }, data: { associadoId: associadoId || null } });
}

// Habilita um usuário existente (por e-mail) no projeto, com um papel (≠ GESTOR).
export async function addOrEnableMember(projectId, email, role = 'MEMBRO') {
  assertValidRole(role);
  assertNotAssigningGestor(role);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new DomainError(404, 'Usuário não encontrado — cadastre a pessoa antes de habilitá-la no projeto.');
  return prisma.membership.upsert({
    where: { userId_projectId: { userId: user.id, projectId } },
    update: { role, active: true },
    create: { userId: user.id, projectId, role },
  });
}

// Altera o papel de um vínculo (não pode mexer no gestor; não atribui GESTOR).
export async function setMemberRole(project, userId, role) {
  assertValidRole(role);
  assertNotAssigningGestor(role);
  assertNotTouchingOwner(project, userId, 'rebaixado');
  const existing = await prisma.membership.findUnique({
    where: { userId_projectId: { userId, projectId: project.id } },
  });
  if (!existing) throw new DomainError(404, 'Vínculo não encontrado neste projeto');
  return prisma.membership.update({
    where: { userId_projectId: { userId, projectId: project.id } },
    data: { role },
  });
}

// Habilita/desabilita um vínculo no projeto (não pode desativar o gestor).
export async function setMemberActive(project, userId, active) {
  if (!active) assertNotTouchingOwner(project, userId, 'desativado');
  const existing = await prisma.membership.findUnique({
    where: { userId_projectId: { userId, projectId: project.id } },
  });
  if (!existing) throw new DomainError(404, 'Vínculo não encontrado neste projeto');
  return prisma.membership.update({
    where: { userId_projectId: { userId, projectId: project.id } },
    data: { active },
  });
}

// Transferência de gestão: operação atômica. O novo gestor precisa ser membro ativo.
// O gestor antigo é rebaixado para ADMIN. ownerUserId passa a apontar para o novo.
export async function transferOwnership(project, newOwnerUserId) {
  const target = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: newOwnerUserId, projectId: project.id } },
  });
  if (!target || !target.active) {
    throw new DomainError(422, 'O novo gestor precisa ser um membro ativo do projeto.');
  }
  if (project.ownerUserId === newOwnerUserId) {
    throw new DomainError(409, 'Este usuário já é o gestor do projeto.');
  }

  return prisma.$transaction(async (tx) => {
    if (project.ownerUserId) {
      await tx.membership.updateMany({
        where: { userId: project.ownerUserId, projectId: project.id },
        data: { role: 'ADMIN' },
      });
    }
    await tx.membership.update({
      where: { userId_projectId: { userId: newOwnerUserId, projectId: project.id } },
      data: { role: 'GESTOR', active: true },
    });
    return tx.project.update({
      where: { id: project.id },
      data: { ownerUserId: newOwnerUserId },
    });
  });
}
