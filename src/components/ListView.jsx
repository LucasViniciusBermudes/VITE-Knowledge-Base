import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { UNCATEGORIZED } from "../lib/colors.js";
import FaqCard from "./FaqCard.jsx";
import SkeletonCard from "./SkeletonCard.jsx";

const SORT_LABELS = {
  recentes: "Mais recentes",
  az: "A-Z",
  acessadas: "Mais acessadas",
};

export default function ListView() {
  const {
    faqs,
    isLoading,
    searchQuery,
    currentCat,
    currentSort,
    setCurrentSort,
  } = useApp();
  const [sortOpen, setSortOpen] = useState(false);

  const list = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = faqs.filter((f) => {
      const catOk =
        currentCat === "Todas" ||
        (currentCat === UNCATEGORIZED ? !f.cat : f.cat === currentCat);
      const searchOk =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.question.toLowerCase().includes(q) ||
        f.body.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q));
      return catOk && searchOk;
    });
    if (currentSort === "az")
      result = [...result].sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR"),
      );
    else if (currentSort === "acessadas")
      result = [...result].sort((a, b) => b.views - a.views);
    else result = [...result].sort((a, b) => b.pinned - a.pinned);
    return result;
  }, [faqs, searchQuery, currentCat, currentSort]);

  return (
    <div id="listView">
      <div className="list-header">
        <span className="results-count">
          {isLoading
            ? ""
            : `${list.length} resultado${list.length !== 1 ? "s" : ""}`}
        </span>
        <div className="sort-wrap">
          <button
            className={`sort-btn${sortOpen ? " open" : ""}`}
            onClick={() => setSortOpen((o) => !o)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="9" y1="18" x2="15" y2="18" />
            </svg>
            <span>{SORT_LABELS[currentSort]}</span>
          </button>
          <div className={`sort-dropdown${sortOpen ? " open" : ""}`}>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <div
                key={key}
                className={`sort-opt${currentSort === key ? " active" : ""}`}
                onClick={() => {
                  setCurrentSort(key);
                  setSortOpen(false);
                }}
              >
                {label} {currentSort === key && <span>✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cards-grid">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : list.length ? (
          list.map((f, i) => <FaqCard key={f.id} faq={f} index={i} />)
        ) : (
          <div className="empty-state">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p>Nenhuma FAQ encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
