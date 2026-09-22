import { TEXT_COLOR_KEYS } from "./colors.js";

export function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Só permite URLs http/https (bloqueia javascript: e outros esquemas perigosos,
// por exemplo em anexos vindos de um JSON importado).
export function safeUrl(url) {
  return /^https?:\/\//i.test(url || "") ? url : "#";
}

// Conversor leve de markdown -> HTML. Seguro: escapa tudo antes de
// reintroduzir apenas as tags conhecidas (negrito, itálico, links, etc).
export function renderMarkdown(raw) {
  if (!raw) return "";
  let html = escapeHtml(raw);
  // cor {{vermelho|texto}} — antes dos demais para permitir aninhar
  // (**negrito** e [links](url) continuam funcionando dentro do span).
  // Só emitimos a CLASSE, e apenas se a chave estiver na lista conhecida:
  // nada vindo do texto do usuário chega ao HTML como cor ou estilo.
  html = html.replace(/\{\{([a-z]+)\|([^}]+)\}\}/g, (m, key, txt) =>
    TEXT_COLOR_KEYS.includes(key)
      ? `<span class="md-c-${key}">${txt}</span>`
      : txt,
  );
  // imagens ![alt](url) — processar ANTES dos links
  html = html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img class="body-img" src="$2" alt="$1">',
  );
  // links [texto](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  // negrito **texto**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // itálico *texto*
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // código `texto`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // listas não ordenadas
  html = html.replace(/(^|\n)((?:- .*(?:\n|$))+)/g, (m, lead, block) => {
    const items = block
      .replace(/\n$/, "")
      .split("\n")
      .map((l) => `<li>${l.replace(/^- /, "")}</li>`)
      .join("");
    return `${lead}<ul>${items}</ul>`;
  });
  // listas ordenadas
  html = html.replace(/(^|\n)((?:\d+\. .*(?:\n|$))+)/g, (m, lead, block) => {
    const items = block
      .replace(/\n$/, "")
      .split("\n")
      .map((l) => `<li>${l.replace(/^\d+\.\s/, "")}</li>`)
      .join("");
    return `${lead}<ol>${items}</ol>`;
  });
  html = html.replace(/\n/g, "<br>");
  return html;
}
