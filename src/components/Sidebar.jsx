import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { allCategories, colorForCat, UNCATEGORIZED } from "../lib/colors.js";

export default function Sidebar() {
  const {
    faqs,
    currentCat,
    setCurrentCat,
    setSearchQuery,
    sidebarOpen,
    setSidebarOpen,
    exportJson,
    importJson,
    requireAuth,
    isAdmin,
    hiddenCats,
    deleteCategory,
    catColors,
    showToast,
  } = useApp();
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const [confirmCat, setConfirmCat] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const baseCats = useMemo(
    () => allCategories(faqs, hiddenCats),
    [faqs, hiddenCats],
  );
  const hasUncategorized = useMemo(() => faqs.some((f) => !f.cat), [faqs]);
  const cats = useMemo(() => {
    const list = ["Todas", ...baseCats];
    if (hasUncategorized) list.push(UNCATEGORIZED);
    return list;
  }, [baseCats, hasUncategorized]);
  const counts = useMemo(() => {
    const c = {};
    cats.forEach((cat) => {
      if (cat === "Todas") c[cat] = faqs.length;
      else if (cat === UNCATEGORIZED)
        c[cat] = faqs.filter((f) => !f.cat).length;
      else c[cat] = faqs.filter((f) => f.cat === cat).length;
    });
    return c;
  }, [cats, faqs]);
  const starred = useMemo(() => faqs.filter((f) => f.starred), [faqs]);
  const allTags = useMemo(
    () => [...new Set(faqs.flatMap((f) => f.tags))].slice(0, 14),
    [faqs],
  );

  const closeOnMobile = () => {
    if (window.innerWidth <= 900) setSidebarOpen(false);
  };

  const handleSetCat = (cat) => {
    setCurrentCat(cat);
    setSearchQuery("");
    navigate("/");
    closeOnMobile();
  };

  // Abre a confirmação de exclusão de categoria (não fecha a sidebar nem navega).
  const handleAskDeleteCat = (e, cat) => {
    e.stopPropagation();
    setConfirmCat(cat);
  };

  const handleConfirmDeleteCat = async () => {
    const cat = confirmCat;
    if (!cat) return;
    setDeleting(true);
    try {
      await deleteCategory(cat);
      if (currentCat === cat) setCurrentCat("Todas");
      setConfirmCat(null);
      showToast(`Categoria "${cat}" excluída`, "#e0554a");
    } catch (err) {
      console.error(err);
      if (err?.message === "SETTINGS_TABLE_MISSING") {
        showToast(
          "Rode o setup-categories.sql para excluir categorias fixas",
          "#e0554a",
        );
      } else {
        showToast("Erro ao excluir categoria", "#e0554a");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchTag = (tag) => {
    setCurrentCat("Todas");
    setSearchQuery(tag);
    navigate("/");
    closeOnMobile();
  };

  const handleOpenFavorite = (id) => {
    navigate(`/faq/${id}`);
    closeOnMobile();
  };

  const handleRequestImport = () => {
    if (!requireAuth("Entre para importar FAQs")) return;
    importInputRef.current?.click();
  };

  const handleImportChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) importJson(file);
  };

  return (
    <>
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div>
          <div className="sec-title">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Categorias
          </div>
          {cats.map((c) => (
            <div
              key={c}
              className={`cat-item${c === currentCat ? " active" : ""}`}
              onClick={() => handleSetCat(c)}
            >
              <span className="cat-label">
                {c === "Todas" ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                ) : (
                  <span
                    className="cat-dot"
                    style={{
                      background: colorForCat(
                        c === UNCATEGORIZED ? "" : c,
                        catColors,
                      ),
                    }}
                  />
                )}
                {c}
              </span>
              <span className="cat-count">{counts[c]}</span>
              {isAdmin && c !== "Todas" && c !== UNCATEGORIZED && (
                <button
                  className="cat-del"
                  title={`Excluir categoria "${c}"`}
                  onClick={(e) => handleAskDeleteCat(e, c)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="sec-title">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Favoritos
          </div>
          {starred.length ? (
            starred.map((f) => (
              <div
                key={f.id}
                className="fav-item"
                title={f.title}
                onClick={() => handleOpenFavorite(f.id)}
              >
                <span
                  className="fav-pipe"
                  style={{ background: colorForCat(f.cat, catColors) }}
                />
                <span className="fav-text">
                  {f.title.length > 28 ? `${f.title.slice(0, 28)}…` : f.title}
                </span>
              </div>
            ))
          ) : (
            <div className="fav-empty">Nenhum favorito</div>
          )}
        </div>

        <div>
          <div className="sec-title">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
            Tags Populares
          </div>
          <div className="tags-cloud">
            {allTags.map((t) => (
              <span
                key={t}
                className="tag-chip"
                onClick={() => handleSearchTag(t)}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="sidebar-tools">
          <button
            className="sidebar-tool-btn"
            title="Exportar todas as FAQs em JSON"
            onClick={exportJson}
          >
            ⭳ Exportar
          </button>
          <button
            className="sidebar-tool-btn"
            title="Importar FAQs de um arquivo JSON"
            onClick={handleRequestImport}
          >
            ⭱ Importar
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImportChange}
          />
        </div>
      </aside>
      <div
        className={`sidebar-backdrop${sidebarOpen ? " show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {confirmCat && (
        <div
          className="overlay open"
          onClick={(e) =>
            e.target === e.currentTarget && !deleting && setConfirmCat(null)
          }
        >
          <div className="modal confirm-modal">
            <div className="modal-hdr">
              <span className="modal-title">Excluir categoria</span>
            </div>
            <p>
              As FAQs em <strong>{confirmCat}</strong> (
              {counts[confirmCat] || 0}) serão movidas para “Sem categoria”.
              <br />
              Nenhuma FAQ será apagada.
            </p>
            <div className="confirm-ftr">
              <button
                className="btn-sec"
                disabled={deleting}
                onClick={() => setConfirmCat(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-cre"
                style={{ background: "#e0554a", color: "#fff" }}
                disabled={deleting}
                onClick={handleConfirmDeleteCat}
              >
                {deleting ? "Excluindo..." : "Excluir categoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
