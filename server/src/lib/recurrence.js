// Expansão simples de recorrências (subconjunto de RRULE do iCalendar):
// FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL=n, COUNT=n, UNTIL=YYYYMMDD
const MAX_OCCURRENCES = 366;

export function expandRecurrences(events, from, to) {
  const out = [];
  for (const ev of events) {
    if (!ev.rrule) {
      if (inRange(ev.start, from, to)) out.push(ev);
      continue;
    }
    const rule = parseRRule(ev.rrule);
    if (!rule.freq) {
      if (inRange(ev.start, from, to)) out.push(ev);
      continue;
    }
    const durationMs = new Date(ev.end) - new Date(ev.start);
    let current = new Date(ev.start);
    let n = 0;
    while (n < MAX_OCCURRENCES) {
      if (rule.count && n >= rule.count) break;
      if (rule.until && current > rule.until) break;
      if (to && current > to) break;
      if (inRange(current, from, to)) {
        out.push({
          ...ev,
          start: new Date(current),
          end: new Date(current.getTime() + durationMs),
          occurrence: true,
          // Âncora da série (datas reais do evento mestre): permite editar a série
          // a partir de qualquer ocorrência sem deslocar a data ao salvar.
          masterStart: ev.start,
          masterEnd: ev.end,
        });
      }
      current = advance(current, rule.freq, rule.interval);
      n++;
    }
  }
  return out.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function inRange(d, from, to) {
  const t = new Date(d);
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
}

function parseRRule(str) {
  const rule = { interval: 1 };
  for (const part of String(str).replace(/^RRULE:/, '').split(';')) {
    const [k, v] = part.split('=');
    if (k === 'FREQ') rule.freq = v;
    if (k === 'INTERVAL') rule.interval = Math.max(1, parseInt(v, 10) || 1);
    if (k === 'COUNT') rule.count = parseInt(v, 10);
    if (k === 'UNTIL') {
      const m = /^(\d{4})(\d{2})(\d{2})/.exec(v);
      if (m) rule.until = new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59`);
    }
  }
  return rule;
}

function advance(date, freq, interval) {
  const d = new Date(date);
  if (freq === 'DAILY') d.setDate(d.getDate() + interval);
  else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7 * interval);
  else if (freq === 'MONTHLY') d.setMonth(d.getMonth() + interval);
  else if (freq === 'YEARLY') d.setFullYear(d.getFullYear() + interval);
  else d.setDate(d.getDate() + interval);
  return d;
}
