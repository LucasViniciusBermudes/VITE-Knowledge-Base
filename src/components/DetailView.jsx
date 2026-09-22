import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { colorForCat } from "../lib/colors.js";
import { renderMarkdown, safeUrl } from "../lib/markdown.js";
import { formatSize } from "../lib/format.js";

export default function DetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const {
    faqs,
    isLoading,
    currentUser,
    incrementViews,
    toggleStar,
    setFaqModal,
    setConfirmModal,
    showToast,
    catColors,
  } = useApp();

  const viewedRef = useRef(new Set());

  const faq = faqs.find((f) => f.id === numericId);

  useEffect(() => {
    if (faq && !viewedRef.current.has(numericId)) {
      viewedRef.current.add(numericId);
      incrementViews(numericId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId, !!faq]);

  if (isLoading) return null;

  if (!faq) {
    return (
      <div className="detail-view">
        <button className="back-btn" onClick={() => navigate("/")}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>{" "}
          Voltar
        </button>
        <div className="detail-not-found">
          <p>Essa FAQ não existe (ou foi excluída).</p>
        </div>
      </div>
    );
  }

  const canEdit = !!currentUser;
  const c = colorForCat(faq.cat, catColors);

  const copyLink = () => {
    const url = `${window.location.origin}/faq/${faq.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => showToast("Link copiado", "#4dab8c"))
      .catch(() => showToast("Não foi possível copiar o link", "#e0554a"));
  };

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={() => navigate("/")}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>{" "}
        Voltar
      </button>

      <div className="detail-top">
        <div className="detail-badges">
          {faq.pinned && (
            <span className="pin-icon">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="m9 9-7 7 3 3 4.5-4.5M14.5 4l-9 9M14.5 4L19 8.5l-2 2-2-2-3 3 2 2-3.5 3.5" />
              </svg>
            </span>
          )}
          <span className="card-tag" style={{ background: `${c}26`, color: c }}>
            {faq.cat}
          </span>
        </div>
        <div className="detail-actions">
          <button className="dact" onClick={copyLink} title="Copiar link">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          {canEdit && (
            <>
              <button
                className={`dact${faq.starred ? " star-on" : ""}`}
                title="Favoritar"
                onClick={() => toggleStar(faq.id)}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill={faq.starred ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                className="dact"
                title="Editar"
                onClick={() => setFaqModal({ open: true, editingId: faq.id })}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                className="dact del"
                title="Excluir"
                onClick={() =>
                  setConfirmModal({ open: true, targetId: faq.id })
                }
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
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <h1 className="detail-title">{faq.title}</h1>
      <p className="detail-question">{faq.question}</p>

      <div className="detail-meta-row">
        <span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {faq.author}
        </span>
        <span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Criado em {faq.created}
        </span>
        <span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Atualizado em {faq.updated}
        </span>
        <span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {faq.views} visualizações
        </span>
      </div>

      <hr className="sep" />

      <div
        className="detail-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(faq.body) }}
      />

      <div className="detail-tags">
        {faq.tags.map((t) => (
          <span key={t} className="detail-tag">
            {t}
          </span>
        ))}
      </div>

      {faq.attachments && faq.attachments.length > 0 && (
        <>
          <div className="att-title">Anexos</div>
          <div className="att-list">
            {faq.attachments.map((a, i) => (
              <div className="att-item" key={a.path || i}>
                <a
                  href={safeUrl(a.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="att-ico">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <div className="att-name">{a.name}</div>
                    <div className="att-size">{formatSize(a.size)}</div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {!canEdit && (
        <div className="locked-note">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Entre com sua conta para favoritar, editar ou excluir esta FAQ.
        </div>
      )}
    </div>
  );
}
