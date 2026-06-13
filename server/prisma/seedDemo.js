// Seed de DADOS FICTÍCIOS para demonstração da agenda.
// Idempotente: remove os itens de demo (por título/nome) antes de recriar.
// Exercita os recursos: eventos multi-dia (barra contínua), espelho em várias
// agendas, convidados, lembretes, videoconferência e recorrência.
//
// Uso:  cd server && node prisma/seedDemo.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helpers de data (mês 0-indexado, igual ao construtor do JS).
const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo, d, h, mi, 0);
const allDayStart = (y, mo, d) => new Date(y, mo, d, 0, 0, 0);
const allDayEnd = (y, mo, d) => new Date(y, mo, d, 23, 59, 0);

async function ensureUser(email, name, password, kind = 'FUNCIONARIO') {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash: await bcrypt.hash(password, 10), kind },
  });
}

// Projeto "agenda" da identidade central (idempotente).
async function ensureProject(key, name, ownerUserId) {
  const project = await prisma.project.upsert({
    where: { key },
    update: { ownerUserId },
    create: { key, name, ownerUserId },
  });
  return project;
}

// Vínculo usuário↔projeto com papel (GESTOR | ADMIN | MEMBRO | VISITANTE).
async function ensureMembership(projectId, userId, role) {
  await prisma.membership.upsert({
    where: { userId_projectId: { userId, projectId } },
    update: { role, active: true },
    create: { userId, projectId, role },
  });
}

async function ensureMember(calendarId, userId, role) {
  await prisma.calendarMember.upsert({
    where: { calendarId_userId: { calendarId, userId } },
    update: { role },
    create: { calendarId, userId, role },
  });
}

async function ensureCalendar(name, type, color, ownerId) {
  let cal = await prisma.calendar.findFirst({ where: { name, type } });
  if (!cal) {
    cal = await prisma.calendar.create({
      data: { name, type, color, members: { create: { userId: ownerId, role: 'OWNER' } } },
    });
  }
  return cal;
}

async function main() {
  // ── Usuários (Daniel = seed; Fernando = login institucional/gestor) ──
  const daniel = await ensureUser('daniel@tri7.com.br', 'Daniel', '123456');
  const fernando = await ensureUser('fernando@tri7.com.br', 'Fernando Orsi', 'admin');

  // ── Projeto agenda + vínculos: Fernando=GESTOR (owner), Daniel=ADMIN ──
  const projeto = await ensureProject('agenda', 'Agenda Institucional', fernando.id);
  await ensureMembership(projeto.id, fernando.id, 'GESTOR');
  await ensureMembership(projeto.id, daniel.id, 'ADMIN');

  // ── Agendas (reusa as existentes; cria Família) ──
  const pessoal = await ensureCalendar('Minha Agenda', 'PESSOAL', '#1a73e8', daniel.id);
  const inst = await ensureCalendar('Agenda Institucional', 'INSTITUCIONAL', '#0b8043', daniel.id);
  const familia = await ensureCalendar('Família', 'FAMILIAR', '#a64dff', daniel.id);

  // Fernando participa de todas; Daniel também na Família.
  for (const c of [pessoal, inst, familia]) await ensureMember(c.id, fernando.id, 'EDITOR');
  await ensureMember(familia.id, daniel.id, 'OWNER');

  const cal = { pessoal: pessoal.id, inst: inst.id, familia: familia.id };

  // ── Definição dos eventos de demonstração ──
  // mirrors = agendas espelho (além da dona). guests = convidados.
  const Y = 2026;
  const events = [
    // Sessões e atividades institucionais
    { cal: 'inst', title: 'Sessão de Escala', category: 'sessao_escala', color: '#0F5C5E',
      start: at(Y, 5, 13, 20, 0), end: at(Y, 5, 13, 23, 0), rrule: 'FREQ=WEEKLY;INTERVAL=2',
      reminders: '60', location: 'Templo — Núcleo Estrela do Oriente', mirrors: ['pessoal'] },
    { cal: 'inst', title: 'Sessão Instrutiva', category: 'sessao_instrutiva',
      start: at(Y, 5, 24, 20, 0), end: at(Y, 5, 24, 22, 30), reminders: '30,1440' },
    { cal: 'inst', title: 'Sessão de Jovens', category: 'sessao_jovens',
      start: at(Y, 5, 27, 16, 0), end: at(Y, 5, 27, 18, 0), reminders: '60' },
    { cal: 'inst', title: 'Reunião de Diretoria', category: 'reuniao',
      start: at(Y, 5, 18, 19, 30), end: at(Y, 5, 18, 21, 0), reminders: '10,60',
      location: 'Sala administrativa', videoConfLink: 'https://meet.google.com/abc-defg-hij',
      description: 'Pauta: orçamento do mutirão, escala de assistência e calendário do 2º semestre.',
      guests: [
        { email: 'fernando@tri7.com.br', name: 'M. Fernando Orsi', status: 'ACEITO' },
        { email: 'rodrigo.mestre@example.com', name: 'M. Rodrigo', status: 'PENDENTE' },
        { email: 'marcia.secretaria@example.com', name: 'Márcia (Secretaria)', status: 'ACEITO' },
      ] },
    { cal: 'inst', title: 'QM/CDC — Quadro de Mestres', category: 'sessao_qm',
      start: at(Y, 6, 4, 20, 0), end: at(Y, 6, 4, 23, 0), reminders: '120' },
    { cal: 'inst', title: 'Sessão Anual de Direção', category: 'sessao_anual',
      start: at(Y, 7, 15, 20, 0), end: at(Y, 7, 15, 23, 30), reminders: '1440' },
    { cal: 'inst', title: 'Preparo de Vegetal', category: 'mutirao',
      start: allDayStart(Y, 5, 14), end: allDayEnd(Y, 5, 14), allDay: true,
      description: 'Preparo de Tucunacá com Caupuri (responsável M. Andrey).' },

    // Eventos institucionais multi-dia (barras contínuas)
    { cal: 'inst', title: 'Mutirão de Limpeza do Templo', category: 'mutirao',
      start: allDayStart(Y, 5, 20), end: allDayEnd(Y, 5, 21), allDay: true,
      location: 'Sede campestre' },
    { cal: 'inst', title: 'Encontro Regional de Núcleos', category: 'encontro',
      start: allDayStart(Y, 6, 10), end: allDayEnd(Y, 6, 12), allDay: true,
      location: 'Núcleo Estrela do Oriente', reminders: '1440',
      description: 'Confraternização e estudos com núcleos da região.' },
    { cal: 'inst', title: 'Retiro Espiritual', category: 'evento_especial',
      start: allDayStart(Y, 6, 25), end: allDayEnd(Y, 6, 27), allDay: true,
      location: 'Sítio Recanto da Paz', mirrors: ['pessoal'], reminders: '1440' },
    { cal: 'inst', title: 'Bazar Beneficente', category: 'bazar',
      start: allDayStart(Y, 7, 1), end: allDayEnd(Y, 7, 3), allDay: true,
      description: 'Renda revertida para a manutenção do templo.' },

    // Pessoais
    { cal: 'pessoal', title: 'Reunião de trabalho', category: 'REUNIAO',
      start: at(Y, 5, 10, 9, 0), end: at(Y, 5, 10, 10, 0), reminders: '10' },
    { cal: 'pessoal', title: 'Consulta médica — Dr. Henrique', category: 'outro',
      start: at(Y, 5, 16, 14, 0), end: at(Y, 5, 16, 15, 0), reminders: '60',
      location: 'Clínica Bem Estar' },
    { cal: 'pessoal', title: 'Academia', category: 'livre',
      start: at(Y, 5, 15, 7, 0), end: at(Y, 5, 15, 8, 0), rrule: 'FREQ=WEEKLY', reminders: '30' },
    { cal: 'pessoal', title: 'Dentista', category: 'outro',
      start: at(Y, 5, 22, 10, 30), end: at(Y, 5, 22, 11, 15), reminders: '60' },
    { cal: 'pessoal', title: 'Pagamento da contribuição mensal', category: 'outro',
      start: allDayStart(Y, 5, 30), end: allDayEnd(Y, 5, 30), allDay: true, reminders: '0' },

    // Família (com espelho na agenda pessoal)
    { cal: 'familia', title: 'Almoço em família', category: 'FAMILIA',
      start: at(Y, 5, 21, 12, 0), end: at(Y, 5, 21, 15, 0), location: 'Casa da Vó' },
    { cal: 'familia', title: 'Reunião de pais — Escola', category: 'FAMILIA',
      start: at(Y, 5, 19, 18, 0), end: at(Y, 5, 19, 19, 0), reminders: '60', mirrors: ['pessoal'] },
    { cal: 'familia', title: 'Aniversário da Sofia', category: 'ANIVERSARIO',
      start: allDayStart(Y, 6, 8), end: allDayEnd(Y, 6, 8), allDay: true, mirrors: ['pessoal'],
      reminders: '1440' },

    // Multi-dia que cruzam a virada de mês/semana (ótimos p/ a barra contínua)
    { cal: 'pessoal', title: 'Férias — Família Andrade', category: 'VIAGEM',
      start: allDayStart(Y, 5, 29), end: allDayEnd(Y, 6, 6), allDay: true, mirrors: ['familia'],
      location: 'Caldas Novas — GO', description: 'Pousada Águas Quentes (reserva confirmada).' },
    { cal: 'familia', title: 'Viagem à praia', category: 'VIAGEM',
      start: allDayStart(Y, 7, 8), end: allDayEnd(Y, 7, 12), allDay: true, mirrors: ['pessoal'],
      location: 'Guarapari — ES' },
  ];

  // ── Limpeza idempotente: remove eventos de demo anteriores (cascata cuida de guests/links) ──
  const titles = events.map((e) => e.title);
  await prisma.event.deleteMany({ where: { title: { in: titles } } });

  // ── Criação ──
  for (const e of events) {
    const ownerId = cal[e.cal];
    const mirrorIds = (e.mirrors || []).map((k) => cal[k]).filter((id) => id && id !== ownerId);
    await prisma.event.create({
      data: {
        calendarId: ownerId,
        creatorId: daniel.id,
        title: e.title,
        description: e.description || null,
        location: e.location || null,
        start: e.start,
        end: e.end,
        allDay: !!e.allDay,
        category: e.category,
        color: e.color || null,
        rrule: e.rrule || null,
        reminders: e.reminders || null,
        videoConfLink: e.videoConfLink || null,
        guests: e.guests?.length
          ? { create: e.guests.map((g) => ({ email: g.email, name: g.name, status: g.status || 'PENDENTE' })) }
          : undefined,
        links: mirrorIds.length ? { create: mirrorIds.map((calendarId) => ({ calendarId })) } : undefined,
      },
    });
  }

  // ── Aniversários (idempotente por nome) ──
  const bdays = [
    { calendarId: inst.id, name: 'João Pedro', birthDate: new Date(2016, 4, 12) },
    { calendarId: inst.id, name: 'Maria Clara', birthDate: new Date(2010, 8, 3) },
    { calendarId: inst.id, name: 'Carlos Alberto', birthDate: new Date(1980, 1, 25) },
    { calendarId: familia.id, name: 'Sofia Andrade', birthDate: new Date(2018, 6, 8), notes: 'Filha caçula' },
    { calendarId: familia.id, name: 'M. Fernando Orsi', birthDate: new Date(1979, 5, 23), phone: '(62) 99999-0001' },
    { calendarId: familia.id, name: 'Helena', birthDate: new Date(2022, 2, 15) },
  ];
  await prisma.birthday.deleteMany({ where: { name: { in: bdays.map((b) => b.name) } } });
  await prisma.birthday.createMany({ data: bdays });

  // ── Tarefas de exemplo ──
  const tasks = [
    { calendarId: pessoal.id, userId: daniel.id, title: 'Organizar documentos da agenda institucional', priority: 'ALTA', dueDate: new Date(Y, 5, 20) },
    { calendarId: inst.id, userId: daniel.id, title: 'Conferir estoque de vegetal antes da escala', priority: 'MEDIA', dueDate: new Date(Y, 5, 13) },
    { calendarId: inst.id, userId: daniel.id, title: 'Montar lista de doações para o bazar', priority: 'BAIXA', dueDate: new Date(Y, 6, 28) },
  ];
  await prisma.task.deleteMany({ where: { title: { in: tasks.map((t) => t.title) } } });
  for (const t of tasks) await prisma.task.create({ data: t });

  const counts = {
    eventos: await prisma.event.count(),
    espelhos: await prisma.eventCalendar.count(),
    convidados: await prisma.eventGuest.count(),
    aniversarios: await prisma.birthday.count(),
    tarefas: await prisma.task.count(),
  };
  console.log('Seed de demonstração concluído:', counts);
  console.log('Agendas: Minha Agenda (pessoal), Agenda Institucional, Família.');
  console.log('Logins: daniel@tri7.com.br / 123456   •   fernando@tri7.com.br / admin');
}

main().finally(() => prisma.$disconnect());
