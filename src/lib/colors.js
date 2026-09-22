// Paleta inspirada nas cores de tag do Notion: tons contidos, sem saturação
// excessiva, para conviver bem tanto no tema claro quanto no escuro.
// Sem categorias fixas: as categorias existem apenas quando alguma FAQ as
// usa (ou quando você cria uma). Assim, excluir qualquer categoria é só
// mover as FAQs dela para "Sem categoria" — ela desaparece naturalmente.
export const DEFAULT_CATS = [];
// Cores sugeridas para alguns nomes comuns, caso venham a ser usados. Não
// cria a categoria — só define a cor automática se ela existir. Você pode
// sempre escolher outra cor ao criar a categoria.
export const CAT_COLORS = {
  RH: "#9065b0",
  TI: "#337ea9",
  Financeiro: "#448361",
  Operações: "#d9730d",
};

// Rótulo das FAQs que ficaram sem categoria (por exemplo, após a categoria
// delas ser excluída). Não é uma categoria de verdade — é só um agrupamento.
export const UNCATEGORIZED = "Sem categoria";

// Paleta fixa de reserva (mesmo espírito do seletor de cor do Notion) usada
// para categorias novas, criadas na hora, via hash do nome — assim o
// resultado nunca fica extremamente vibrante ou ilegível.
const FALLBACK_PALETTE = [
  "#787774",
  "#9065b0",
  "#337ea9",
  "#448361",
  "#d9730d",
  "#dfab01",
  "#c14c8a",
  "#d44c47",
];

// Cores oferecidas no seletor ao criar uma categoria. Mesmo espírito da
// paleta do Notion — legíveis nos dois temas.
export const PALETTE = [
  "#9065b0",
  "#337ea9",
  "#448361",
  "#d9730d",
  "#dfab01",
  "#c14c8a",
  "#d44c47",
  "#787774",
  "#5b7bb0",
  "#2f9e7e",
];

export function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

// `custom` é o mapa nome->cor escolhido pelo usuário (persistido no banco).
// Precedência: cor escolhida > cor fixa das categorias padrão > hash do nome.
export function colorForCat(cat, custom) {
  return (custom && custom[cat]) || CAT_COLORS[cat] || hashColor(cat || "?");
}

// `hidden` são categorias fixas que o Admin excluiu. Elas deixam de ser
// sugeridas — mas se alguma FAQ ainda usar o nome (ex.: após uma importação),
// a categoria volta a aparecer, porque aí ela existe de fato.
export function allCategories(faqs, hidden = []) {
  const set = new Set(DEFAULT_CATS.filter((c) => !hidden.includes(c)));
  faqs.forEach((f) => {
    if (f.cat) set.add(f.cat);
  });
  return [...set];
}

// ── cores de texto do editor ──
//
// O markdown não tem sintaxe de cor, então usamos um marcador próprio:
// `{{vermelho|texto}}`. O renderMarkdown só aceita as chaves desta lista e
// emite uma CLASSE (md-c-vermelho), nunca a cor vinda do texto — assim não há
// como injetar CSS ou HTML pelo corpo da FAQ.
//
// A cor real fica no index.css, com um tom para cada tema: os hexes do Notion
// abaixo são ótimos no tema claro, mas ficam escuros demais no escuro.
export const TEXT_COLORS = [
  { key: "roxo", label: "Roxo", hex: "#9065b0" },
  { key: "azul", label: "Azul", hex: "#337ea9" },
  { key: "verde", label: "Verde", hex: "#448361" },
  { key: "laranja", label: "Laranja", hex: "#d9730d" },
  { key: "amarelo", label: "Amarelo", hex: "#b8890a" },
  { key: "rosa", label: "Rosa", hex: "#c14c8a" },
  { key: "vermelho", label: "Vermelho", hex: "#d44c47" },
  { key: "cinza", label: "Cinza", hex: "#787774" },
];

export const TEXT_COLOR_KEYS = TEXT_COLORS.map((c) => c.key);
