// O Supabase Auth só faz login por e-mail. Como o time entra digitando
// apenas o nome de usuário ("patricia"), cada conta recebe um e-mail
// interno no formato `usuario@DOMINIO` — que nunca precisa existir de
// verdade, já que a confirmação por e-mail fica desligada no projeto.
//
// Se você mudar este domínio, mude também o secret KB_EMAIL_DOMAIN da
// Edge Function, senão as contas novas nascem com um e-mail diferente
// do que o login procura.
export const LOGIN_EMAIL_DOMAIN = (
  import.meta.env.VITE_LOGIN_EMAIL_DOMAIN || "kb.liguelead.com.br"
)
  .trim()
  .toLowerCase();

export const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

export function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

// Aceita também um e-mail completo, para contas criadas manualmente no
// painel do Supabase com um endereço real.
export function usernameToEmail(value) {
  const clean = normalizeUsername(value);
  if (!clean) return "";
  return clean.includes("@") ? clean : `${clean}@${LOGIN_EMAIL_DOMAIN}`;
}

export function emailToUsername(email) {
  return String(email || "").split("@")[0];
}

// Mínimo aceito na troca de senha. Precisa bater com o MIN_PASSWORD da Edge
// Function — quem valida de verdade é ela; aqui é só para avisar antes.
export const MIN_PASSWORD = 8;

// Alfabeto sem os caracteres que se confundem quando a senha é ditada por
// telefone ou copiada de um post-it: l/I/1 e O/0 ficam de fora.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Senha inicial aleatória, gerada no navegador do Admin e mostrada uma única
// vez. Antes era `usuario + "123"`: com a lista de usuários visível na tela de
// Usuários, isso era praticamente um chaveiro aberto. Como a conta nasce com
// `must_change_password`, esta senha só serve para o primeiro acesso.
export function generatePassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join("");
}
