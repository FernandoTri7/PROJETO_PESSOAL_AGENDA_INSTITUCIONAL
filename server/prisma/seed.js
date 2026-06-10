import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'daniel@tri7.com.br' },
    update: {},
    create: {
      name: 'Daniel',
      email: 'daniel@tri7.com.br',
      passwordHash: await bcrypt.hash('123456', 10),
      role: 'ADMIN',
    },
  });

  const pessoal = await prisma.calendar.create({
    data: {
      name: 'Minha Agenda',
      type: 'PESSOAL',
      color: '#1a73e8',
      members: { create: { userId: admin.id, role: 'OWNER' } },
    },
  });

  const institucional = await prisma.calendar.create({
    data: {
      name: 'Agenda Institucional',
      type: 'INSTITUCIONAL',
      color: '#0b8043',
      members: { create: { userId: admin.id, role: 'OWNER' } },
    },
  });

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  await prisma.event.createMany({
    data: [
      {
        calendarId: institucional.id, creatorId: admin.id,
        title: 'Sessão de Escala', category: 'SESSAO', color: '#0b8043',
        start: new Date(y, m, 7, 20, 0), end: new Date(y, m, 7, 23, 0),
        rrule: 'FREQ=WEEKLY;INTERVAL=2', reminders: '60',
      },
      {
        calendarId: pessoal.id, creatorId: admin.id,
        title: 'Reunião de trabalho', category: 'REUNIAO',
        start: new Date(y, m, 10, 9, 0), end: new Date(y, m, 10, 10, 0),
      },
    ],
  });

  await prisma.task.create({
    data: {
      calendarId: pessoal.id, userId: admin.id,
      title: 'Organizar documentos da agenda institucional',
      priority: 'ALTA', dueDate: new Date(y, m, 20),
    },
  });

  await prisma.birthday.createMany({
    data: [
      { calendarId: institucional.id, name: 'João Pedro', birthDate: new Date(2016, 4, 12) },
      { calendarId: institucional.id, name: 'Maria Clara', birthDate: new Date(2010, 8, 3) },
      { calendarId: institucional.id, name: 'Carlos Alberto', birthDate: new Date(1980, 1, 25) },
    ],
  });

  // Sessões de exemplo extraídas do histórico real
  await prisma.sessionRecord.createMany({
    data: [
      {
        calendarId: institucional.id, creatorId: admin.id,
        date: new Date(2025, 9, 24), type: 'COMEMORATIVA', title: 'Aniversário NRL',
        dirigente: 'M. Edson Saraiva', assistente: 'M. Fernando Orsi', som: 'Pedro Daltro',
        vegetalDescricao: 'Tucunacá reforçado com Caupuri (preparo M. Andrey)',
        coadoLitros: 26, retornoLitros: 4.5, coposSimples: 209,
      },
      {
        calendarId: institucional.id, creatorId: admin.id,
        date: new Date(2025, 9, 4), type: 'ESCALA', title: 'Sessão de escala',
        dirigente: 'M. Rodrigo', assistente: 'M. Fernando Orsi', som: 'João Pedro',
        vegetalDescricao: '14L Itinga M. Leopoldo + 2L retorno sessão São Cosmo e Damião',
        coadoLitros: 16, retornoLitros: 2, coposSimples: 142, coposDuplos: 2,
      },
      {
        calendarId: institucional.id, creatorId: admin.id,
        date: new Date(2025, 8, 27), type: 'COMEMORATIVA', title: 'Sessão São Cosme e Damião',
        dirigente: 'M. Márcio da Rós', assistente: 'M. Fernando Orsi', som: 'João Gabriel',
        vegetalDescricao: '14L Tucunacá (M. Andrey)',
        coadoLitros: 14, retornoLitros: 2.25, coposSimples: 122, coposDuplos: 3, coposCriancas: 14,
      },
    ],
  });

  await prisma.vegetalLote.createMany({
    data: [
      { nome: 'Caupuri NRI 25/07/25', origem: 'Preparo NRI', litros: 206, local: 'FORA' },
      { nome: 'Caupuri NRL 25/07/25', origem: 'Preparo NRL', litros: 204, local: 'FORA' },
      { nome: 'Retorno geladeira', origem: 'Retornos de sessões', litros: 8.5, local: 'GELADEIRA' },
    ],
  });

  console.log('Seed concluído. Login: daniel@tri7.com.br / senha: 123456');
}

main().finally(() => prisma.$disconnect());
