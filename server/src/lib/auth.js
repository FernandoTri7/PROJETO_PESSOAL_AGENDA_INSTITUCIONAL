import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const isProd = process.env.NODE_ENV === 'production';

// Em produção o segredo é obrigatório: a API recusa subir sem ele (RF-01 da spec de segurança).
// Em desenvolvimento, mantém um fallback explícito para não travar o fluxo local.
if (isProd && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não definido. Defina a variável de ambiente antes de subir em produção.');
  process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-trocar-em-producao';

// Projeto ativo padrão. Enquanto o cliente não envia o header X-Project, tudo cai na "agenda".
// (Identidade central — ver docs/arquitetura-identidade-central.md)
export const DEFAULT_PROJECT_KEY = 'agenda';

// Papéis que dão poder elevado DENTRO de um projeto (equivalente ao antigo ADMIN global).
const ELEVATED_ROLES = ['GESTOR', 'ADMIN'];
export function isElevatedRole(role) {
  return ELEVATED_ROLES.includes(role);
}

// O JWT carrega apenas a identidade (userId). O papel é resolvido por projeto a cada request,
// via Membership, para que revogar/rebaixar acesso valha na próxima chamada (sem esperar o token expirar).
export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return res.status(401).json({ error: 'Usuário inválido' });
    req.user = user;

    // Resolve o projeto ativo (header X-Project, ou "agenda" por padrão) e o vínculo do usuário nele.
    const projectKey = (req.headers['x-project'] || DEFAULT_PROJECT_KEY).toString();
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, active: true, project: { key: projectKey, active: true } },
      include: { project: true },
    });
    req.membership = membership; // pode ser null (usuário sem vínculo ativo neste projeto)
    req.project = membership?.project || null;
    // Poder elevado no projeto atual — substitui o antigo atalho `user.role === 'ADMIN'`.
    req.isElevated = membership ? isElevatedRole(membership.role) : false;

    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Verifica se o usuário tem acesso à agenda; "write" exige OWNER/EDITOR (ou ADMIN global).
export async function calendarAccess(userId, calendarId, write = false) {
  const member = await prisma.calendarMember.findUnique({
    where: { calendarId_userId: { calendarId, userId } },
  });
  if (!member) return false;
  if (write) return member.role === 'OWNER' || member.role === 'EDITOR';
  return true;
}

export async function requireCalendar(req, res, calendarId, write = false) {
  if (req.isElevated) return true;
  const ok = await calendarAccess(req.user.id, calendarId, write);
  if (!ok) res.status(403).json({ error: 'Sem permissão nesta agenda' });
  return ok;
}

// Verifica se uma agenda é do tipo INSTITUCIONAL (edição exclusiva de administradores).
export async function calendarIsInstitutional(calendarId) {
  const c = await prisma.calendar.findUnique({ where: { id: calendarId }, select: { type: true } });
  return c?.type === 'INSTITUCIONAL';
}

// Escrita com regra da agenda institucional:
// ADMIN sempre pode; a agenda INSTITUCIONAL é exclusiva de ADMIN; as demais exigem OWNER/EDITOR.
// Retorna true/false e já responde 403 quando nega.
export async function requireCalendarWrite(req, res, calendarId) {
  if (req.isElevated) return true;
  if (await calendarIsInstitutional(calendarId)) {
    res.status(403).json({ error: 'Apenas administradores podem alterar a agenda institucional' });
    return false;
  }
  const ok = await calendarAccess(req.user.id, calendarId, true);
  if (!ok) res.status(403).json({ error: 'Sem permissão nesta agenda' });
  return ok;
}

// Versão silenciosa (não responde): true se o usuário pode escrever na agenda,
// respeitando a exclusividade da institucional para papéis elevados do projeto.
export async function canWriteCalendar(req, calendarId) {
  if (req.isElevated) return true;
  if (await calendarIsInstitutional(calendarId)) return false;
  return calendarAccess(req.user.id, calendarId, true);
}

// Middleware: exige que o vínculo do usuário NO PROJETO atual tenha um dos papéis informados.
// (Antes checava o papel global em User.role; agora usa Membership.role — identidade central.)
// Usado em recursos do projeto que não pertencem a uma agenda específica (ex.: estoque, categorias).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return res.status(403).json({ error: 'Sem permissão para esta operação' });
    }
    next();
  };
}

// Alias semântico para o novo modelo. Idêntico a requireRole, mas o nome deixa claro
// que a autorização é por vínculo de projeto.
export const requireMembership = requireRole;
