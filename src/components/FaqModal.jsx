import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import {
  allCategories,
  colorForCat,
  PALETTE,
  TEXT_COLORS,
} from "../lib/colors.js";
import { renderMarkdown } from "../lib/markdown.js";
import { formatSize } from "../lib/format.js";

const QUICK_TAGS_LIST = [
  "onboarding",
  "benefícios",
  "férias",
  "salário",
  "vpn",
  "email",
  "equipamento",
  "segurança",
  "reembolso",
  "nota fiscal",
  "orçamento",
  "pagamento",
];

const emptyForm = {
  title: "",
  question: "",
  body: "",
  cat: "",
  pinned: false,
  tags: [],
};

export default function FaqModal() {
  const {
    faqModal,
    setFaqModal,
    faqs,
    saveFaq,
    uploadFile,
    removeUploadedFile,
    showToast,
    hiddenCats,
    catColors,
    saveCategoryColor,
  } = useApp();
  const navigate = useNavigate();
  const editingFaq = faqModal.editingId
    ? faqs.find((f) => f.id === faqModal.editingId)
    : null;

  // O objeto de `faqs` é recriado a cada loadFaqs/toggleStar/incrementViews.
  // Guardá-lo num ref permite que o efeito abaixo dependa só do id — sem isso,
  // qualquer atualização da FAQ com o modal aberto resetava o formulário e
  // descartava o que estava sendo digitado.
  const editingFaqRef = useRef(editingFaq);
  editingFaqRef.current = editingFaq;

  const [form, setForm] = useState(emptyForm);
  const [attachments, setAttachments] = useState([]);
  const [extraCats, setExtraCats] = useState([]);
  const [rtTab, setRtTab] = useState("write");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [shakeField, setShakeField] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  // Modal de nova categoria (nome + cor). `open:false` = fechado.
  const [newCat, setNewCat] = useState({
    open: false,
    name: "",
    color: PALETTE[0],
  });
  // Modal de inserir link. Guarda a seleção do textarea no momento da abertura.
  const [linkModal, setLinkModal] = useState({
    open: false,
    url: "",
    start: 0,
    end: 0,
    selected: "",
  });

  // Seletor de cor do texto (aberto pelo botão "A" da barra de formatação).
  const [colorMenu, setColorMenu] = useState(false);

  const bodyRef = useRef(null);
  const colorMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const inlineImgInputRef = useRef(null);
  // Guarda se o botão do mouse foi PRESSIONADO no fundo do overlay. Sem isso,
  // selecionar texto e soltar o mouse fora do modal era interpretado como um
  // clique no fundo e abria a confirmação de fechar sem querer.
  const overlayDownRef = useRef(false);

  useEffect(() => {
    if (!faqModal.open) return;
    const target = editingFaqRef.current;
    if (target) {
      setForm({
        title: target.title,
        question: target.question,
        body: target.body,
        cat: target.cat,
        pinned: target.pinned,
        tags: [...target.tags],
      });
      setAttachments(
        (target.attachments || []).map((a) => ({ ...a, isNew: false })),
      );
    } else {
      setForm(emptyForm);
      setAttachments([]);
    }
    setExtraCats([]);
    setRtTab("write");
    setTagInput("");
    setShakeField("");
    setConfirmClose(false);
    setNewCat({ open: false, name: "", color: PALETTE[0] });
    setLinkModal({ open: false, url: "", start: 0, end: 0, selected: "" });
    setColorMenu(false);
  }, [faqModal.open, faqModal.editingId]);

  useEffect(() => {
    if (!colorMenu) return;
    const onDown = (e) => {
      if (!colorMenuRef.current?.contains(e.target)) setColorMenu(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setColorMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [colorMenu]);

  const categories = useMemo(() => {
    const base = allCategories(faqs, hiddenCats);
    const set = new Set([...base, ...extraCats]);
    return [...set];
  }, [faqs, extraCats, hiddenCats]);

  if (!faqModal.open) return null;

  const close = () => setFaqModal({ open: false, editingId: null });

  // Há algo digitado/alterado que se perderia ao fechar? Para uma FAQ nova,
  // qualquer campo preenchido conta; ao editar, conta qualquer diferença em
  // relação à FAQ salva.
  const isDirty = () => {
    const base = editingFaq
      ? {
          title: editingFaq.title,
          question: editingFaq.question,
          body: editingFaq.body,
          cat: editingFaq.cat,
          pinned: editingFaq.pinned,
          tags: editingFaq.tags || [],
        }
      : emptyForm;
    if (form.title.trim() !== base.title) return true;
    if (form.question.trim() !== base.question) return true;
    if (form.body.trim() !== base.body) return true;
    if (form.cat !== base.cat) return true;
    if (form.pinned !== base.pinned) return true;
    if (
      form.tags.length !== base.tags.length ||
      form.tags.some((t, i) => t !== base.tags[i])
    )
      return true;
    const baseAtt = editingFaq ? editingFaq.attachments || [] : [];
    if (attachments.length !== baseAtt.length) return true;
    return false;
  };

  // Fecha direto se nada mudou; senão pede confirmação. Durante o salvamento,
  // ignora tentativas de fechar para não interromper o upload.
  const attemptClose = () => {
    if (saving) return;
    if (isDirty()) setConfirmClose(true);
    else close();
  };

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const shake = (field) => {
    setShakeField(field);
    setTimeout(() => setShakeField(""), 1200);
  };

  // ── categoria ──
  const handleCatChange = (e) => {
    const val = e.target.value;
    if (val === "__new__") {
      setNewCat({ open: true, name: "", color: PALETTE[0] });
      return;
    }
    setField("cat", val);
  };

  const confirmNewCat = async () => {
    const clean = newCat.name.trim();
    if (!clean) return;
    // Já existe? Só seleciona, sem duplicar nem sobrescrever a cor.
    const exists = categories.some(
      (c) => c.toLowerCase() === clean.toLowerCase(),
    );
    if (!exists) {
      setExtraCats((prev) => [...prev, clean]);
      await saveCategoryColor(clean, newCat.color);
    }
    setField("cat", clean);
    setNewCat({ open: false, name: "", color: PALETTE[0] });
  };

  // ── editor de texto ──
  const wrapSelection = (before, after = before) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = form.body;
    const selected = val.slice(start, end) || "texto";
    const next =
      val.slice(0, start) + before + selected + after + val.slice(end);
    setField("body", next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  };

  // Envolve a seleção no marcador de cor. Sem seleção, `wrapSelection` já
  // insere a palavra "texto" selecionada — é só digitar por cima.
  const applyColor = (key) => {
    setColorMenu(false);
    wrapSelection(`{{${key}|`, "}}");
  };

  // Remove a cor: desfaz o marcador mais próximo em volta do cursor.
  const clearColor = () => {
    setColorMenu(false);
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const val = form.body;
    const open = val.lastIndexOf("{{", start);
    if (open === -1) return;
    const close = val.indexOf("}}", open);
    if (close === -1 || close < start - 2) return;
    const inner = val.slice(open, close + 2);
    const m = inner.match(/^\{\{[a-z]+\|([\s\S]*)\}\}$/);
    if (!m) return;
    setField("body", val.slice(0, open) + m[1] + val.slice(close + 2));
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = open + m[1].length;
    });
  };

  const linePrefix = (prefix) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const val = form.body;
    const lineStart = val.lastIndexOf("\n", start - 1) + 1;
    const next = val.slice(0, lineStart) + prefix + val.slice(lineStart);
    setField("body", next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    });
  };

  const insertLink = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.body.slice(start, end) || "texto do link";
    setLinkModal({ open: true, url: "https://", start, end, selected });
  };

  const confirmLink = () => {
    const url = linkModal.url.trim();
    if (!url || url === "https://") return;
    const { start, end, selected } = linkModal;
    const md = `[${selected}](${url})`;
    setField("body", form.body.slice(0, start) + md + form.body.slice(end));
    setLinkModal({ open: false, url: "", start: 0, end: 0, selected: "" });
  };

  const handleInlineImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    showToast("Enviando imagem...", "#529cca");
    try {
      const { url } = await uploadFile(file, "inline");
      const ta = bodyRef.current;
      const start = ta ? ta.selectionStart : form.body.length;
      const md = `\n![${file.name}](${url})\n`;
      setField("body", form.body.slice(0, start) + md + form.body.slice(start));
      showToast("Imagem inserida", "#4dab8c");
    } catch (err) {
      console.error(err);
      showToast("Erro ao enviar imagem", "#e0554a");
    }
  };

  // ── anexos ──
  const handleAttachFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setAttachments((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        isNew: true,
        uploading: false,
      })),
    ]);
  };

  const removeAttachment = (index) => {
    const a = attachments[index];
    if (a && !a.isNew && a.path) removeUploadedFile(a.path);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── tags ──
  const toggleQuickTag = (tag) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  };
  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (val && !form.tags.includes(val))
      setForm((f) => ({ ...f, tags: [...f.tags, val] }));
    setTagInput("");
  };
  const removeTag = (tag) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  // ── salvar ──
  const handleSubmit = async () => {
    const title = form.title.trim();
    const question = form.question.trim();
    const body = form.body.trim();
    const cat = form.cat;

    if (!title) return shake("title");
    if (!question) return shake("question");
    if (!cat || cat === "__new__") return shake("cat");

    setSaving(true);
    setSaveLabel("Salvando...");
    try {
      const pending = attachments.filter((a) => a.isNew && a.file);
      if (pending.length) setSaveLabel("Enviando arquivos...");

      const updated = [...attachments];
      for (let i = 0; i < updated.length; i++) {
        const a = updated[i];
        if (!(a.isNew && a.file)) continue;
        updated[i] = { ...a, uploading: true };
        setAttachments([...updated]);
        // Usa o path devolvido pelo uploadFile: ele gera o próprio
        // `${Date.now()}-...`, então recalcular aqui produzia um caminho
        // diferente do que foi realmente enviado, e os arquivos ficavam
        // órfãos no bucket ao excluir a FAQ.
        const { url, path } = await uploadFile(a.file, "files");
        updated[i] = {
          name: a.name,
          size: a.size,
          url,
          path,
          type: a.file.type,
          isNew: false,
          uploading: false,
        };
        setAttachments([...updated]);
      }

      const finalAttachments = updated.map((a) => ({
        name: a.name,
        size: a.size,
        url: a.url,
        path: a.path,
        type: a.type,
      }));

      await saveFaq({
        editingId: faqModal.editingId,
        title,
        question,
        body,
        cat,
        tags: form.tags,
        pinned: form.pinned,
        attachments: finalAttachments,
      });

      close();
      showToast(
        faqModal.editingId
          ? "FAQ atualizada com sucesso"
          : "FAQ criada com sucesso",
        "#4dab8c",
      );
      if (faqModal.editingId) navigate(`/faq/${faqModal.editingId}`);
    } catch (err) {
      console.error(err);
      showToast(
        "Erro ao salvar — confira as permissões (RLS) no Supabase",
        "#e0554a",
      );
    } finally {
      setSaving(false);
      setSaveLabel("");
    }
  };

  return (
    <div
      className="overlay open"
      onMouseDown={(e) => {
        overlayDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && overlayDownRef.current)
          attemptClose();
        overlayDownRef.current = false;
      }}
    >
      <div className="modal modal-wide">
        <div className="modal-hdr">
          <span className="modal-title">
            {editingFaq ? "Editar FAQ" : "Nova FAQ"}
          </span>
          <button className="modal-x" onClick={attemptClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="faq-head">
          <div className="fi">
            <input
              className="fi-input big"
              style={
                shakeField === "title" ? { borderColor: "#e0554a" } : undefined
              }
              type="text"
              placeholder="Título da FAQ"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
            />
          </div>
          <div className="fi">
            <input
              className="fi-input"
              style={
                shakeField === "question"
                  ? { borderColor: "#e0554a" }
                  : undefined
              }
              type="text"
              placeholder="Escreva a pergunta..."
              value={form.question}
              onChange={(e) => setField("question", e.target.value)}
            />
          </div>
          <hr className="form-sep" />
        </div>

        <div className="faq-grid">
          <div className="faq-main">
            <div className="rt-toolbar">
              <button
                className={`rt-tab${rtTab === "write" ? " active" : ""}`}
                onClick={() => setRtTab("write")}
              >
                Escrever
              </button>
              <button
                className={`rt-tab${rtTab === "preview" ? " active" : ""}`}
                onClick={() => setRtTab("preview")}
              >
                Pré-visualizar
              </button>
              <span className="rt-sep" />
              <button
                className="rt-btn"
                title="Negrito"
                onClick={() => wrapSelection("**")}
              >
                <b style={{ fontWeight: 800 }}>B</b>
              </button>
              <button
                className="rt-btn"
                title="Itálico"
                onClick={() => wrapSelection("*")}
              >
                <i
                  style={{
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                  }}
                >
                  I
                </i>
              </button>
              <button
                className="rt-btn"
                title="Código"
                onClick={() => wrapSelection("`")}
              >
                {"{ }"}
              </button>
              <button
                className="rt-btn"
                title="Lista"
                onClick={() => linePrefix("- ")}
              >
                •
              </button>
              <button
                className="rt-btn"
                title="Lista numerada"
                onClick={() => linePrefix("1. ")}
              >
                1.
              </button>
              <button className="rt-btn" title="Link" onClick={insertLink}>
                🔗
              </button>
              <button
                className="rt-btn"
                title="Inserir imagem"
                onClick={() => inlineImgInputRef.current?.click()}
              >
                🖼️
              </button>
              <span className="rt-color-wrap" ref={colorMenuRef}>
                <button
                  className={`rt-btn rt-color-btn${colorMenu ? " active" : ""}`}
                  title="Cor do texto"
                  onClick={() => setColorMenu((v) => !v)}
                >
                  A<span className="rt-color-bar" />
                </button>
                {colorMenu && (
                  <div className="rt-color-pop">
                    <div className="rt-color-title">Cor do texto</div>
                    <div className="rt-color-grid">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.key}
                          className="rt-swatch"
                          title={c.label}
                          style={{ background: c.hex }}
                          onClick={() => applyColor(c.key)}
                        />
                      ))}
                    </div>
                    <button className="rt-color-clear" onClick={clearColor}>
                      Remover cor
                    </button>
                  </div>
                )}
              </span>
            </div>
            <input
              ref={inlineImgInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleInlineImage}
            />

            <div className="fi">
              {rtTab === "write" ? (
                <textarea
                  ref={bodyRef}
                  className="fi-ta"
                  rows={5}
                  placeholder="Escreva a resposta aqui. Use os botões acima para formatar, adicionar links e imagens."
                  value={form.body}
                  onChange={(e) => setField("body", e.target.value)}
                />
              ) : (
                <div
                  className="rt-preview"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(form.body),
                  }}
                />
              )}
            </div>
          </div>

          <div className="faq-side">
            <div className="fl">Anexos</div>
            <div className="attach-row">
              <button
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Adicionar arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleAttachFiles}
              />
            </div>
            {attachments.length > 0 && (
              <div className="attlist">
                {attachments.map((a, i) => (
                  <div className="attlist-item" key={i}>
                    <span className="aname">{a.name}</span>
                    <span className="asize">{formatSize(a.size)}</span>
                    {a.uploading ? (
                      <span className="aspin">enviando…</span>
                    ) : (
                      <button
                        title="Remover"
                        onClick={() => removeAttachment(i)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <hr className="form-sep" />
            <div className="form-row">
              <div className="fg">
                <div className="fl">Categoria</div>
                <select
                  className="f-select"
                  style={
                    shakeField === "cat"
                      ? { borderColor: "#e0554a" }
                      : undefined
                  }
                  value={form.cat}
                  onChange={handleCatChange}
                >
                  <option value="">Selecione</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__new__">+ Nova categoria…</option>
                </select>
              </div>
              <div className="fg">
                <div className="fl">Destaque</div>
                <div className="toggle-row">
                  <div
                    className={`toggle${form.pinned ? " on" : ""}`}
                    onClick={() => setField("pinned", !form.pinned)}
                  >
                    <div className="toggle-k" />
                  </div>
                  <span className="toggle-lbl">Destacar esta FAQ</span>
                </div>
              </div>
            </div>

            <div className="fl">Tags</div>
            <div className="tags-irow">
              <input
                className="tags-inp"
                type="text"
                placeholder="Adicionar tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button className="btn-addtag" onClick={addTag}>
                +
              </button>
            </div>
            <div className="quick-tags">
              {QUICK_TAGS_LIST.map((t) => (
                <span
                  key={t}
                  className={`qtag${form.tags.includes(t) ? " selected" : ""}`}
                  onClick={() => toggleQuickTag(t)}
                >
                  {form.tags.includes(t) ? "✓ " : ""}
                  {t}
                </span>
              ))}
            </div>
            <div className="sel-tags">
              {form.tags.map((t) => (
                <span className="sel-tag" key={t}>
                  {t}
                  <button onClick={() => removeTag(t)}>×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-ftr">
          <button className="btn-sec" onClick={attemptClose}>
            Cancelar
          </button>
          <button className="btn-cre" disabled={saving} onClick={handleSubmit}>
            {saving
              ? saveLabel
              : editingFaq
                ? "Salvar alterações"
                : "Criar FAQ"}
          </button>
        </div>
      </div>

      {confirmClose && (
        <div
          className="overlay open"
          style={{ zIndex: 110 }}
          onClick={(e) =>
            e.target === e.currentTarget && setConfirmClose(false)
          }
        >
          <div className="modal confirm-modal">
            <div className="modal-hdr">
              <span className="modal-title">Descartar alterações?</span>
            </div>
            <p>
              Você tem informações preenchidas que ainda não foram salvas.
              <br />
              Se fechar agora, elas serão perdidas.
            </p>
            <div className="confirm-ftr">
              <button
                className="btn-sec"
                onClick={() => setConfirmClose(false)}
              >
                Continuar editando
              </button>
              <button
                className="btn-cre"
                style={{ background: "#e0554a", color: "#fff" }}
                onClick={() => {
                  setConfirmClose(false);
                  close();
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
      {newCat.open && (
        <div
          className="overlay open"
          style={{ zIndex: 110 }}
          onClick={(e) =>
            e.target === e.currentTarget &&
            setNewCat({ open: false, name: "", color: PALETTE[0] })
          }
        >
          <div
            className="modal confirm-modal"
            style={{ textAlign: "left", maxWidth: 380 }}
          >
            <div className="modal-hdr" style={{ justifyContent: "flex-start" }}>
              <span className="modal-title">Nova categoria</span>
            </div>

            <div className="fl">Nome</div>
            <input
              className="fi-input"
              type="text"
              autoFocus
              placeholder="Ex.: Jurídico"
              value={newCat.name}
              onChange={(e) =>
                setNewCat((s) => ({ ...s, name: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmNewCat();
                }
              }}
            />

            <div className="fl" style={{ marginTop: 14 }}>
              Cor
            </div>
            <div className="color-grid">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch${newCat.color === color ? " selected" : ""}`}
                  style={{ background: color }}
                  aria-label={`Cor ${color}`}
                  onClick={() => setNewCat((s) => ({ ...s, color }))}
                />
              ))}
            </div>

            <div className="cat-preview">
              <span
                className="card-tag"
                style={{ background: `${newCat.color}26`, color: newCat.color }}
              >
                {newCat.name.trim() || "Prévia"}
              </span>
            </div>

            <div
              className="confirm-ftr"
              style={{ justifyContent: "flex-end", marginTop: 18 }}
            >
              <button
                className="btn-sec"
                onClick={() =>
                  setNewCat({ open: false, name: "", color: PALETTE[0] })
                }
              >
                Cancelar
              </button>
              <button
                className="btn-cre"
                disabled={!newCat.name.trim()}
                onClick={confirmNewCat}
              >
                Criar categoria
              </button>
            </div>
          </div>
        </div>
      )}
      {linkModal.open && (
        <div
          className="overlay open"
          style={{ zIndex: 110 }}
          onClick={(e) =>
            e.target === e.currentTarget &&
            setLinkModal({
              open: false,
              url: "",
              start: 0,
              end: 0,
              selected: "",
            })
          }
        >
          <div
            className="modal confirm-modal"
            style={{ textAlign: "left", maxWidth: 400 }}
          >
            <div className="modal-hdr" style={{ justifyContent: "flex-start" }}>
              <span className="modal-title">Inserir link</span>
            </div>

            <div className="fl">Texto</div>
            <input
              className="fi-input"
              type="text"
              value={linkModal.selected}
              onChange={(e) =>
                setLinkModal((s) => ({ ...s, selected: e.target.value }))
              }
              placeholder="Texto que aparece"
            />

            <div className="fl" style={{ marginTop: 14 }}>
              Endereço
            </div>
            <input
              className="fi-input"
              type="url"
              autoFocus
              value={linkModal.url}
              onChange={(e) =>
                setLinkModal((s) => ({ ...s, url: e.target.value }))
              }
              placeholder="https://..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmLink();
                }
              }}
            />

            <div
              className="confirm-ftr"
              style={{ justifyContent: "flex-end", marginTop: 18 }}
            >
              <button
                className="btn-sec"
                onClick={() =>
                  setLinkModal({
                    open: false,
                    url: "",
                    start: 0,
                    end: 0,
                    selected: "",
                  })
                }
              >
                Cancelar
              </button>
              <button
                className="btn-cre"
                disabled={
                  !linkModal.url.trim() || linkModal.url.trim() === "https://"
                }
                onClick={confirmLink}
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
