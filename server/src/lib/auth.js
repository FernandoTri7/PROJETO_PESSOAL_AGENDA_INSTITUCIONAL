import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-trocar-em-producao';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
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
  if (req.user.role === 'ADMIN') return true;
  const ok = await calendarAccess(req.user.id, calendarId, write);
  if (!ok) res.status(403).json({ error: 'Sem permissão nesta agenda' });
  return ok;
}
