// Componentes de marca — "Agenda Institucional".
// Símbolo (tile teal + calendário branco com dia laranja) e wordmark (DM Sans + sufixo).
// Uso no web (topbar, sidebar, login). Ver docs/design-system-spec.md §6.

import { brand } from './theme';

export function AgendaMark({ size = 36 }: { size?: number }) {
  // viewBox 0–64: o rx="14" escala automaticamente com `size`.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="Agenda Institucional">
      <rect width="64" height="64" rx="14" fill={brand.teal} />
      <rect x="14" y="16" width="36" height="34" rx="6" fill="#FFFFFF" />
      <rect x="14" y="16" width="36" height="9" rx="6" fill={brand.tealDark} />
      <rect x="21" y="12" width="4" height="9" rx="2" fill={brand.tealDark} />
      <rect x="39" y="12" width="4" height="9" rx="2" fill={brand.tealDark} />
      <rect x="33" y="33" width="11" height="11" rx="2.5" fill={brand.orange} />
    </svg>
  );
}

export function AgendaWordmark({
  color = '#1F2933',
  accent = brand.orangeDark,
  size = 18,
}: { color?: string; accent?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: size, color, letterSpacing: '-0.01em' }}>
        Agenda
      </span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: Math.max(8, size * 0.5), letterSpacing: '0.34em', textTransform: 'uppercase', color: accent, marginTop: 2 }}>
        Institucional
      </span>
    </span>
  );
}

export function AgendaLockup({
  markSize = 34,
  wordColor = '#1F2933',
  accent = brand.orangeDark,
}: { markSize?: number; wordColor?: string; accent?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <AgendaMark size={markSize} />
      <AgendaWordmark color={wordColor} accent={accent} />
    </span>
  );
}
