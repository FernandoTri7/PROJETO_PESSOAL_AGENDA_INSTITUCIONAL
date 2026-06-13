// Design System — Agenda Institucional (base portável TRI7: teal + laranja).
// Token-driven: trocar um valor aqui re-tematiza o app nativo inteiro.
// Ver docs/design-system-spec.md.

// ───────────────────────── Paleta (light + dark) ─────────────────────────

export const brand = {
  teal: '#0F5C5E',
  tealDark: '#073C3E',
  orange: '#F5A018',
  orangeDark: '#D67708',
};

export const palette = {
  light: {
    background: '#F5F7F8',
    foreground: '#1F2933',
    card: '#FFFFFF',
    primary: '#0F5C5E',
    primaryForeground: '#FFFFFF',
    accent: '#F5A018',
    accentHover: '#D67708',
    accentForeground: '#1F2933',
    secondary: '#EBEFF1',
    secondaryForeground: '#283139',
    muted: '#EEF1F2',
    mutedForeground: '#52606D',
    border: '#DCE2E5',
    input: '#DCE2E5',
    ring: '#F5A018',
    success: '#22C55E',
    warning: '#F59E0B',
    destructive: '#EF4444',
    info: '#0F5C5E',
    sidebar: '#073C3E',
    sidebarForeground: '#D3E0E0',
    sidebarPrimary: '#F5A018',
    sidebarAccent: '#103E40',
  },
  dark: {
    background: '#12191C',
    foreground: '#E8EBED',
    card: '#192024',
    primary: '#2BA7AB',
    primaryForeground: '#06201F',
    accent: '#F6AB31',
    accentHover: '#D67708',
    accentForeground: '#1F2933',
    secondary: '#222B30',
    secondaryForeground: '#E8EBED',
    muted: '#1E262B',
    mutedForeground: '#9BA7AE',
    border: '#313A3F',
    input: '#313A3F',
    ring: '#F6AB31',
    success: '#34D277',
    warning: '#FBB13B',
    destructive: '#F36B6B',
    info: '#2BA7AB',
    sidebar: '#0E1316',
    sidebarForeground: '#D3E0E0',
    sidebarPrimary: '#F6AB31',
    sidebarAccent: '#14343A',
  },
} as const;

export type Mode = keyof typeof palette;
export const tokens = (mode: Mode = 'light') => palette[mode];

// ───────────────────────── Escala (raio, espaço, elevação) ─────────────────────────

export const radius = { md: 8, base: 10, lg: 14, xl: 20, full: 9999 };
export const space = (n: number) => n * 4; // space(4) => 16px

export const elevation = {
  1: { shadowColor: '#0F171B', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  2: { shadowColor: '#0F171B', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  3: { shadowColor: '#0F171B', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  4: { shadowColor: '#0F171B', shadowOpacity: 0.10, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
} as const;

export const typography = {
  fontBody: 'Inter, system-ui, sans-serif',
  fontDisplay: 'DM Sans, sans-serif',
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  scale: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 },
} as const;

// ───────────────────────── Compatibilidade com as telas atuais ─────────────────────────
// As telas nativas importam `colors`; mantém as mesmas chaves, agora no tema light tokenizado.

const t = palette.light;
export const colors = {
  bg: t.background,
  card: t.card,
  border: t.border,
  text: t.foreground,
  muted: t.mutedForeground,
  primary: t.primary,
  accent: t.accent, // laranja — cor de CTA (FAB "criar")
  green: t.success,
  red: t.destructive,
  yellow: t.warning,
};

// ───────────────────────── Categorias e domínio ─────────────────────────
// Cores alinhadas aos tokens (sessões na família teal; aniversário/CTA no laranja).

export const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'REUNIAO', label: 'Reunião', color: '#5B6B7F' },
  { key: 'SESSAO', label: 'Sessão', color: '#2A8C8A' },
  { key: 'TRABALHO', label: 'Trabalho', color: '#6A8D4F' },
  { key: 'FAMILIA', label: 'Família', color: '#3FA66F' },
  { key: 'VIAGEM', label: 'Viagem', color: '#9B6BC2' },
  { key: 'ANIVERSARIO', label: 'Aniversário', color: '#E89A3C' },
  { key: 'OUTRO', label: 'Outro', color: '#7C8A99' },
];

export const SESSION_TYPES = [
  'ESCALA', 'ESCALA_ANUAL', 'INSTRUTIVA', 'EXTRA', 'ADVENTICIOS',
  'DIRECAO', 'QUADRO_DE_MESTRES', 'COMEMORATIVA', 'OUTRA',
];

// Fonte ÚNICA das categorias do calendário (web + nativo), alinhada aos tokens.
// O web salva eventos com estes `key`; cores de marca usam teal/laranja do sistema.
// Paleta suave e com hues distintos (legível com texto branco nos chips do calendário).
export const NAV_CATS = [
  { key: 'sessao_escala',     label: 'Sessão de Escala',    color: '#2A8C8A' },
  { key: 'sessao_instrutiva', label: 'Sessão Instrutiva',   color: '#3D7EA6' },
  { key: 'sessao_extra',      label: 'Sessão Extra',        color: '#6A8D4F' },
  { key: 'sessao_qm',         label: 'QM/CDC',              color: '#7E6BA6' },
  { key: 'sessao_jovens',     label: 'Sessão de Jovens',    color: '#3FA66F' },
  { key: 'sessao_anual',      label: 'Sessão Anual',        color: '#1F6E70' },
  { key: 'sessao_especial',   label: 'Sessão Especial',     color: '#C97B5A' },
  { key: 'reuniao',           label: 'Reunião',             color: '#5B6B7F' },
  { key: 'evento_especial',   label: 'Evento Especial',     color: '#D98E3D' },
  { key: 'bazar',             label: 'Bazar',               color: '#9B6BC2' },
  { key: 'mutirao',           label: 'Mutirão',             color: '#B57A45' },
  { key: 'feriado',           label: 'Feriado',             color: '#D9655B' },
  { key: 'aniversario',       label: 'Aniversário',         color: '#E89A3C' },
  { key: 'encontro',          label: 'Encontro',            color: '#4F8FC0' },
  { key: 'livre',             label: 'Livre',               color: '#7C8A99' },
  { key: 'outro',             label: 'Outro',               color: '#9AA0A6' },
];

// Fallback para os enums de Event.category do backend (taxonomia do nativo).
const ENUM_CAT_COLOR: Record<string, string> = {
  REUNIAO: '#5B6B7F', SESSAO: '#2A8C8A', TRABALHO: '#6A8D4F',
  FAMILIA: '#3FA66F', VIAGEM: '#9B6BC2', ANIVERSARIO: '#E89A3C', OUTRO: '#7C8A99',
};
const ENUM_CAT_LABEL: Record<string, string> = {
  REUNIAO: 'Reunião', SESSAO: 'Sessão', TRABALHO: 'Trabalho',
  FAMILIA: 'Família', VIAGEM: 'Viagem', ANIVERSARIO: 'Aniversário', OUTRO: 'Outro',
};

// Mapa de categorias usado por getCatColor/getCatLabel. Começa com os fallbacks do código
// (NAV_CATS + enums nativos) e é sobrescrito por setCategories() quando a API responde.
type CatEntry = { label: string; color: string };

function buildFallbackMap(): Record<string, CatEntry> {
  const m: Record<string, CatEntry> = {};
  for (const c of NAV_CATS) m[c.key] = { label: c.label, color: c.color };
  for (const k of Object.keys(ENUM_CAT_COLOR)) m[k] = { label: ENUM_CAT_LABEL[k] ?? k, color: ENUM_CAT_COLOR[k] };
  return m;
}

let CAT_MAP: Record<string, CatEntry> = buildFallbackMap();

// Alimenta o mapa com as categorias vindas de /api/categories (mantém os fallbacks como base).
export function setCategories(list: { key: string; label: string; color: string }[]) {
  const m = buildFallbackMap();
  for (const c of list) m[c.key] = { label: c.label, color: c.color };
  CAT_MAP = m;
}

export function getCatColor(category: string) {
  return CAT_MAP[category]?.color ?? '#9AA0A6';
}

export function getCatLabel(category: string) {
  return CAT_MAP[category]?.label ?? category;
}
