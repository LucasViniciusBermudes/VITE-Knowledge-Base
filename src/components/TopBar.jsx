import { useApp } from "../context/AppContext.jsx";

export default function TopBar() {
  const {
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    displayName,
    isAdmin,
    signOut,
    setAuthModal,
    setFaqModal,
    setUsersModal,
    setLogsModal,
    requireAuth,
  } = useApp();

  const handleNewFaq = () => {
    if (!requireAuth("Entre para criar uma FAQ")) return;
    setFaqModal({ open: true, editingId: null });
  };

  const initial = (displayName || "?").charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-text">Base de Conhecimento</span>
      </div>

      <div className="search-wrap">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="Pesquisar FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="topbar-right">
        <button
          className="btn-icon"
          title="Tema"
          aria-label="Alternar tema"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {isAdmin && (
          <button
            className="btn-icon"
            title="Registro de atividade"
            aria-label="Registro de atividade"
            onClick={() => setLogsModal(true)}
          >
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
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </button>
        )}

        {isAdmin && (
          <button
            className="btn-icon"
            title="Usuários"
            aria-label="Gerenciar usuários"
            onClick={() => setUsersModal(true)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        )}

        {currentUser ? (
          <div className="user-chip">
            <span className="user-avatar">{initial}</span>
            <span className="uname">{displayName}</span>
            {isAdmin && <span className="chip-role">admin</span>}
            <button onClick={signOut} title="Sair">
              Sair
            </button>
          </div>
        ) : (
          <button
            className="btn-ghost"
            onClick={() => setAuthModal({ open: true, mode: "signin" })}
          >
            Entrar
          </button>
        )}

        <button className="btn-primary" onClick={handleNewFaq}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="btxt">Nova FAQ</span>
        </button>
      </div>
    </header>
  );
}
