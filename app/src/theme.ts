export const colors = {
  bg: '#0f1115',
  card: '#1a1d24',
  border: '#2a2e38',
  text: '#e8eaed',
  muted: '#9aa0a6',
  primary: '#1a73e8',
  green: '#0b8043',
  red: '#d93025',
  yellow: '#f9ab00',
};

export const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'REUNIAO', label: 'Reunião', color: '#d93025' },
  { key: 'SESSAO', label: 'Sessão', color: '#0b8043' },
  { key: 'TRABALHO', label: 'Trabalho', color: '#1a73e8' },
  { key: 'FAMILIA', label: 'Família', color: '#f9ab00' },
  { key: 'VIAGEM', label: 'Viagem', color: '#a142f4' },
  { key: 'ANIVERSARIO', label: 'Aniversário', color: '#f6bf26' },
  { key: 'OUTRO', label: 'Outro', color: '#9aa0a6' },
];

export const SESSION_TYPES = [
  'ESCALA', 'ESCALA_ANUAL', 'INSTRUTIVA', 'EXTRA', 'ADVENTICIOS',
  'DIRECAO', 'QUADRO_DE_MESTRES', 'COMEMORATIVA', 'OUTRA',
];
