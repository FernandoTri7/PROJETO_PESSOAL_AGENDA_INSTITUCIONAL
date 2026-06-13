// Fase da lua para uma data — cálculo aproximado (ciclo sinódico), suficiente para exibição.
// Não depende de rede nem de calendário externo.
const SYNODIC = 29.530588853; // dias do ciclo lunar
const EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const LABEL = [
  'Lua nova', 'Crescente côncava', 'Quarto crescente', 'Crescente gibosa',
  'Lua cheia', 'Minguante gibosa', 'Quarto minguante', 'Minguante côncava',
];

export function moonPhase(date: Date): { idx: number; emoji: string; label: string; principal: boolean } {
  // Lua nova de referência: 2000-01-06 18:14 UTC.
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (date.getTime() - ref) / 86400000;
  let frac = (days % SYNODIC) / SYNODIC;
  if (frac < 0) frac += 1;
  const idx = Math.round(frac * 8) % 8; // 0..7
  // Fases principais (índices pares): nova, quarto crescente, cheia, quarto minguante.
  return { idx, emoji: EMOJI[idx], label: LABEL[idx], principal: idx % 2 === 0 };
}
