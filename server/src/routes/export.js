import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendar } from '../lib/auth.js';

export const exportRouter = Router();

// Exporta uma agenda no formato iCalendar (.ics) — compatível com Google Agenda
exportRouter.get('/ics/:calendarId', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.calendarId, false))) return;
  const cal = await prisma.calendar.findUnique({ where: { id: req.params.calendarId } });
  const events = await prisma.event.findMany({ where: { calendarId: req.params.calendarId } });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Institucional//PT-BR',
    `X-WR-CALNAME:${escapeICS(cal?.name || 'Agenda')}`,
  ];
  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@agenda-institucional`);
    lines.push(`DTSTAMP:${toICSDate(ev.createdAt)}`);
    lines.push(`DTSTART:${toICSDate(ev.start)}`);
    lines.push(`DTEND:${toICSDate(ev.end)}`);
    lines.push(`SUMMARY:${escapeICS(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`);
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="agenda.ics"');
  res.send(lines.join('\r\n'));
});

// Exporta tudo em JSON (backup) e importa de volta
exportRouter.get('/json/:calendarId', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.calendarId, false))) return;
  const calendarId = req.params.calendarId;
  const [events, tasks, birthdays, sessions] = await Promise.all([
    prisma.event.findMany({ where: { calendarId } }),
    prisma.task.findMany({ where: { calendarId } }),
    prisma.birthday.findMany({ where: { calendarId } }),
    prisma.sessionRecord.findMany({ where: { calendarId } }),
  ]);
  res.json({ events, tasks, birthdays, sessions });
});

exportRouter.post('/json/:calendarId', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.calendarId, true))) return;
  const calendarId = req.params.calendarId;
  const b = req.body || {};
  let imported = 0;
  for (const ev of b.events || []) {
    await prisma.event.create({
      data: {
        calendarId,
        creatorId: req.user.id,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        start: new Date(ev.start),
        end: new Date(ev.end || ev.start),
        allDay: !!ev.allDay,
        category: ev.category || 'OUTRO',
        rrule: ev.rrule,
      },
    });
    imported++;
  }
  for (const bd of b.birthdays || []) {
    await prisma.birthday.create({
      data: { calendarId, name: bd.name, birthDate: new Date(bd.birthDate), phone: bd.phone, notes: bd.notes },
    });
    imported++;
  }
  res.json({ ok: true, imported });
});

function toICSDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
function escapeICS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
