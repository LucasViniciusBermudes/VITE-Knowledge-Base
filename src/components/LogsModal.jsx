import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";

const PAGE = 50;

// Como cada ação aparece escrita na tela. O verbo fica separado do alvo para
// a linha ler como frase: "Patricia excluiu a FAQ Política de Home Office".
const ACTIONS = {
  "faq.create": { verbo: "criou a FAQ", cor: "#4dab8c" },
  "faq.update": { verbo: "editou a FAQ", cor: "#529cca" },
  "faq.delete": { verbo: "excluiu a FAQ", cor: "#e0554a" },
  "faq.star": { verbo: "favoritou a FAQ", cor: "#dfab01" },
  "faq.pin": { verbo: "fixou a FAQ", cor: "#529cca" },
  "user.create": { verbo: "criou a conta de", cor: "#4dab8c" },
  "user.delete": { verbo: "excluiu a conta de", cor: "#e0554a" },
  "user.role": { verbo: "alterou o papel de", cor: "#9065b0" },
  "user.password": { verbo: "redefiniu a senha de", cor: "#d9730d" },
  "user.email": { verbo: "alterou o e-mail de", cor: "#d9730d" },
  "self.password": { verbo: "trocou a própria senha", cor: "#787774" },
};

// Data e hora completas: num log, "há 3 dias" não serve para nada.
const STAMP = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function describe(entry) {
  const meta = ACTIONS[entry.action] || { verbo: entry.action, cor: "#787774" };
  const d = entry.details || {};

  let extra = "";
  if (entry.action === "faq.update" && Array.isArray(d.campos)) {
    extra = `(${d.campos.join(", ")})`;
  } else if (entry.action === "faq.star") {
    extra = d.valor === false ? "(desfavoritou)" : "";
  } else if (entry.action === "faq.pin") {
    extra = d.valor === false ? "(desafixou)" : "";
  } else if (entry.action === "user.role") {
    extra = d.role === "admin" ? "(para Admin)" : "(para membro)";
  }

  return { ...meta, extra };
}

export default function LogsModal() {
  const { logsModal, setLogsModal, isAdmin, loadActivityLog } = useApp();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [end, setEnd] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadActivityLog({ offset: 0, limit: PAGE });
      setEntries(data);
      setEnd(data.length < PAGE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadActivityLog]);

  useEffect(() => {
    if (!logsModal) return;
    load();
  }, [logsModal, load]);

  if (!logsModal) return null;

  const close = () => setLogsModal(false);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await loadActivityLog({ offset: entries.length, limit: PAGE });
      setEntries((prev) => [...prev, ...data]);
      if (data.length < PAGE) setEnd(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div
      className="overlay open"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal users-modal">
        <div className="modal-hdr">
          <span className="modal-title">Registro de atividade</span>
          <button className="modal-x" onClick={close}>
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

        {!isAdmin ? (
          <p className="users-empty">Só o Admin pode ver o registro.</p>
        ) : (
          <>
            {error && <div className="auth-error show">{error}</div>}

            {loading ? (
              <p className="users-empty">Carregando...</p>
            ) : entries.length === 0 ? (
              <p className="users-empty">Nada registrado ainda.</p>
            ) : (
              <div className="log-list">
                {entries.map((e) => {
                  const { verbo, cor, extra } = describe(e);
                  return (
                    <div className="log-row" key={e.id}>
                      <span className="log-dot" style={{ background: cor }} />
                      <div className="log-main">
                        <div className="log-line">
                          <strong>{e.actor_name || "—"}</strong> {verbo}{" "}
                          {e.entity_label && (
                            <span className="log-target">{e.entity_label}</span>
                          )}{" "}
                          {extra && <span className="log-extra">{extra}</span>}
                        </div>
                        <div className="log-when">
                          {STAMP.format(new Date(e.created_at))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="modal-ftr">
              <button className="btn-sec" onClick={close}>
                Fechar
              </button>
              {!end && entries.length > 0 && (
                <button
                  className="btn-cre"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? "Carregando..." : "Carregar mais"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
