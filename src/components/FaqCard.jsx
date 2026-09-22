import { useNavigate } from "react-router-dom";
import { colorForCat, UNCATEGORIZED } from "../lib/colors.js";
import { useApp } from "../context/AppContext.jsx";

export default function FaqCard({ faq, index }) {
  const navigate = useNavigate();
  const { toggleStar, togglePin, catColors } = useApp();
  const c = colorForCat(faq.cat, catColors);
  const tags = faq.tags.slice(0, 2);
  const extra = faq.tags.length > 2 ? faq.tags.length - 2 : 0;

  return (
    <div
      className={`card${faq.pinned ? " pinned" : ""}`}
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={() => navigate(`/faq/${faq.id}`)}
    >
      <div className="card-header">
        <div className="card-title">{faq.title}</div>
        <div className="card-btns">
          <button
            className={`cbtn${faq.pinned ? " pin-on" : ""}`}
            title="Fixar"
            onClick={(e) => {
              e.stopPropagation();
              togglePin(faq.id);
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={faq.pinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m9 9-7 7 3 3 4.5-4.5M14.5 4l-9 9M14.5 4L19 8.5l-2 2-2-2-3 3 2 2-3.5 3.5" />
            </svg>
          </button>
          <button
            className={`cbtn${faq.starred ? " star-on" : ""}`}
            title="Favoritar"
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(faq.id);
            }}
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
        </div>
      </div>

      <div className="card-question">{faq.question}</div>

      <div className="card-tags">
        <span className="card-tag" style={{ background: `${c}26`, color: c }}>
          {faq.cat || UNCATEGORIZED}
        </span>
        {tags.map((t) => (
          <span key={t} className="card-tag t-other">
            {t}
          </span>
        ))}
        {extra > 0 && <span className="card-tag t-plus">+{extra}</span>}
      </div>

      <div className="card-footer">
        <span className="card-author">{faq.author}</span>
        <span className="card-meta">
          {faq.attachments && faq.attachments.length > 0 && (
            <span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {faq.attachments.length}
            </span>
          )}
          <span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {faq.views}
          </span>
          <span>{faq.updated}</span>
        </span>
      </div>
    </div>
  );
}
