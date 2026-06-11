// Geração de iCalendar (.ics) para um único evento — usado no convite por e-mail.

export function toICSDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function escapeICS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Monta um VCALENDAR com um VEVENT (METHOD:REQUEST para anexo de convite).
export function buildEventIcs(ev) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Institucional//PT-BR',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${ev.id}@agenda-institucional`,
    `DTSTAMP:${toICSDate(ev.createdAt || new Date())}`,
    `DTSTART:${toICSDate(ev.start)}`,
    `DTEND:${toICSDate(ev.end)}`,
    `SUMMARY:${escapeICS(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`);
  if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}
