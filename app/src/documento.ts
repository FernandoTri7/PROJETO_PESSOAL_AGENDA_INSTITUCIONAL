// CPF — normalização, formatação e validação (dígitos verificadores).
// Padrão Tri7: armazenar só dígitos; formatar na borda (UI). Ver skill cpf-cnpj.

export const soDigitos = (v: string): string => (v ?? '').replace(/\D/g, '');

export function formatCpf(value: string): string {
  const d = soDigitos(value).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += '.' + d.slice(3, 6);
  if (d.length > 6) out += '.' + d.slice(6, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  return out;
}

// Exibição mascarada (LGPD): esconde os 3 primeiros e os 2 últimos dígitos → ***.282.791-**
export function mascararCpf(value: string): string {
  const d = soDigitos(value);
  if (d.length !== 11) return d ? formatCpf(value) : '';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function validarCpf(value: string): boolean {
  const cpf = soDigitos(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let d1 = 11 - (soma % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let d2 = 11 - (soma % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === Number(cpf[10]);
}
