// Schemas de validação (zod) para os corpos de requisição de mutação.
// Estratégia: validar presença, tipo primitivo e enums, SEM transformar os valores —
// a conversão para Date/Number permanece nos routers, que já a tratam.

import { z } from 'zod';

// ── Helpers de tipo "parecido com" (aceitam as formas que os routers já convertem) ──

// Valor que representa uma data válida (string ISO, número epoch ou Date).
const dateLike = z
  .union([z.string().min(1), z.number(), z.date()])
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'data inválida' });

// Valor numérico (número ou string numérica).
const numLike = z.union([
  z.number(),
  z.string().regex(/^-?\d+(\.\d+)?$/, 'número inválido'),
]);

// String opcional que também pode vir como null (para limpar o campo) ou ausente.
const optText = z.string().nullish();

// ── Enums do domínio ──
const calendarType = z.enum(['PESSOAL', 'FAMILIAR', 'INSTITUCIONAL']);
const categoryScope = z.enum(['PESSOAL', 'FAMILIAR', 'INSTITUCIONAL', 'TODAS']);
const memberRole = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
const taskPriority = z.enum(['BAIXA', 'MEDIA', 'ALTA']);
const vegetalLocal = z.enum(['GELADEIRA', 'FORA', 'OUTRO']);
const sessionType = z.enum([
  'ESCALA', 'ESCALA_ANUAL', 'INSTRUTIVA', 'EXTRA', 'ADVENTICIOS',
  'DIRECAO', 'QUADRO_DE_MESTRES', 'COMEMORATIVA', 'OUTRA',
]);

// ── Auth ──
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'nome é obrigatório'),
  email: z.string().trim().email('e-mail inválido'),
  password: z.string().min(6, 'senha deve ter ao menos 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('e-mail inválido'),
  password: z.string().min(1, 'senha é obrigatória'),
});

export const prefsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  useInstitutional: z.boolean().optional(),
  hiddenCalendarIds: z.array(z.string().min(1)).optional(),
}).partial();

// ── Agendas e membros ──
export const calendarCreateSchema = z.object({
  name: z.string().trim().min(1, 'nome é obrigatório'),
  type: calendarType.optional(),
  color: z.string().optional(),
});
export const calendarUpdateSchema = calendarCreateSchema.partial();

// ── Categorias ──
export const categoryCreateSchema = z.object({
  key: z.string().trim().min(1).optional(), // se ausente, derivada do label (slug)
  label: z.string().trim().min(1, 'nome é obrigatório'),
  color: z.string().optional(),
  scope: categoryScope.optional(),
  order: numLike.optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const memberSchema = z.object({
  email: z.string().trim().email('e-mail inválido'),
  role: memberRole.optional(),
});

// ── Projetos e vínculos (identidade central) ──
// GESTOR é deliberadamente omitido aqui: só se atribui via transferência de gestão.
const assignableProjectRole = z.enum(['VISITANTE', 'MEMBRO', 'ADMIN']);

export const projectCreateSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_-]*$/, 'key inválida (minúsculas, sem espaços; ex.: "admin")'),
  name: z.string().trim().min(1, 'nome é obrigatório'),
});

export const projectMemberAddSchema = z.object({
  email: z.string().trim().email('e-mail inválido'),
  role: assignableProjectRole.optional(),
});

export const projectMemberUpdateSchema = z
  .object({ role: assignableProjectRole.optional(), active: z.boolean().optional() })
  .refine((d) => d.role !== undefined || d.active !== undefined, { message: 'informe role ou active' });

export const transferOwnershipSchema = z
  .object({ userId: z.string().min(1).optional(), email: z.string().trim().email().optional() })
  .refine((d) => d.userId || d.email, { message: 'informe userId ou email do novo gestor' });

// ── Eventos ──
const eventVisibility = z.enum(['padrao', 'publico', 'privado']);
const eventAvailability = z.enum(['OCUPADO', 'LIVRE']);
const guestSchema = z.object({ email: z.string().trim().email('e-mail inválido'), name: optText });
const attachmentSchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().min(1),
  provider: z.string().optional(),
  mimeType: optText,
});

export const eventCreateSchema = z.object({
  calendarId: z.string().min(1, 'calendarId é obrigatório'),
  title: z.string().trim().min(1, 'título é obrigatório'),
  description: optText,
  location: optText,
  start: dateLike,
  end: dateLike.nullish(),
  allDay: z.boolean().optional(),
  category: z.string().optional(),
  color: optText,
  rrule: optText,
  reminders: optText,
  visibility: eventVisibility.optional(),
  availability: eventAvailability.optional(),
  videoConfLink: optText,
  // Agendas adicionais (espelho) onde o evento também aparece, além da agenda dona.
  linkedCalendarIds: z.array(z.string().min(1)).optional(),
  guests: z.array(guestSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
});
export const eventUpdateSchema = eventCreateSchema.partial();

// ── Tarefas ──
export const taskCreateSchema = z.object({
  calendarId: z.string().min(1, 'calendarId é obrigatório'),
  title: z.string().trim().min(1, 'título é obrigatório'),
  description: optText,
  dueDate: dateLike.nullish(),
  priority: taskPriority.optional(),
  done: z.boolean().optional(),
});
export const taskUpdateSchema = taskCreateSchema.partial();

// ── Aniversários ──
export const birthdayCreateSchema = z.object({
  calendarId: z.string().min(1, 'calendarId é obrigatório'),
  name: z.string().trim().min(1, 'nome é obrigatório'),
  birthDate: dateLike,
  phone: optText,
  notes: optText,
});
export const birthdayUpdateSchema = birthdayCreateSchema.partial();

// ── Sessões ──
export const sessionCreateSchema = z.object({
  calendarId: z.string().min(1, 'calendarId é obrigatório'),
  date: dateLike,
  type: sessionType.optional(),
  title: optText,
  dirigente: optText,
  assistente: optText,
  auxAssistente: optText,
  som: optText,
  leituraDocumentos: optText,
  explanacao: optText,
  vegetalDescricao: optText,
  observacoes: optText,
  coadoLitros: numLike.nullish(),
  comungadoLitros: numLike.nullish(),
  retornoLitros: numLike.nullish(),
  coposSimples: numLike.nullish(),
  coposDuplos: numLike.nullish(),
  coposCriancas: numLike.nullish(),
  repeticoes: numLike.nullish(),
});
export const sessionUpdateSchema = sessionCreateSchema.partial();

// ── Estoque de vegetal ──
export const vegetalCreateSchema = z.object({
  nome: z.string().trim().min(1, 'nome é obrigatório'),
  origem: optText,
  litros: numLike,
  local: vegetalLocal.optional(),
  notas: optText,
});
export const vegetalUpdateSchema = vegetalCreateSchema.partial();
