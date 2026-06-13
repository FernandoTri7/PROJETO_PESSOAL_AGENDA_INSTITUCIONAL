// Feriados nacionais do Brasil — calculados localmente (sem rede).
// Fixos + móveis derivados da Páscoa (computus). Inclui os comumente exibidos
// (Carnaval e Corpus Christi são facultativos, mas marcados na agenda).

function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=março, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Lista de feriados nacionais do ano (data + nome).
export function brHolidays(year: number): { date: Date; name: string }[] {
  const e = easter(year);
  return [
    { date: new Date(year, 0, 1), name: 'Confraternização Universal' },
    { date: addDays(e, -47), name: 'Carnaval' },
    { date: addDays(e, -2), name: 'Sexta-feira Santa' },
    { date: new Date(year, 3, 21), name: 'Tiradentes' },
    { date: new Date(year, 4, 1), name: 'Dia do Trabalho' },
    { date: addDays(e, 60), name: 'Corpus Christi' },
    { date: new Date(year, 8, 7), name: 'Independência do Brasil' },
    { date: new Date(year, 9, 12), name: 'Nossa Senhora Aparecida' },
    { date: new Date(year, 10, 2), name: 'Finados' },
    { date: new Date(year, 10, 15), name: 'Proclamação da República' },
    { date: new Date(year, 10, 20), name: 'Consciência Negra' },
    { date: new Date(year, 11, 25), name: 'Natal' },
  ];
}

// Mapa { 'YYYY-MM-DD' -> nome } usando a mesma chave do calendário (dayKey).
export function brHolidayMap(year: number, dayKey: (d: Date) => string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of brHolidays(year)) map[dayKey(h.date)] = h.name;
  return map;
}
