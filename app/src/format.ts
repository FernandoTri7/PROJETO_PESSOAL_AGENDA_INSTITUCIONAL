// Helpers de formatação de exibição compartilhados (web e nativo).

// Conectores que permanecem minúsculos em nomes próprios (pt-BR).
const NAME_CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'la']);

// Formata um nome em caixa Alta-e-baixa (Title Case), mantendo conectores minúsculos.
export function titleCaseNome(s?: string | null): string {
  if (!s) return '';
  return String(s).trim().toLowerCase().split(/\s+/).map((w, i) =>
    i > 0 && NAME_CONNECTORS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}
