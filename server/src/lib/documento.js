// CPF — normalização, formatação e validação (dígitos verificadores).
// Padrão Tri7: armazenar só dígitos; formatar na borda. Ver skill cpf-cnpj.

export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function formatCpf(value) {
  const d = soDigitos(value).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += '.' + d.slice(3, 6);
  if (d.length > 6) out += '.' + d.slice(6, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  return out;
}

export function validarCpf(value) {
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
