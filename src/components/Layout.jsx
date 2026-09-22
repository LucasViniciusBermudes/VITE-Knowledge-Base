import { Outlet } from "react-router-dom";
import TopBar from "./TopBar.jsx";
import Sidebar from "./Sidebar.jsx";
import Toast from "./Toast.jsx";
import FaqModal from "./FaqModal.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import AuthModal from "./AuthModal.jsx";
import UsersModal from "./UsersModal.jsx";
import LogsModal from "./LogsModal.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Layout() {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  return (
    <>
      <TopBar />
      <div className={`layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <Sidebar />
        <button
          className="sidebar-edge-toggle"
          aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {sidebarCollapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
        <main className="main">
          <Outlet />
        </main>
      </div>

      <FaqModal />
      <ConfirmModal />
      <AuthModal />
      <UsersModal />
      <LogsModal />
      {/* Por último e com o z-index mais alto: enquanto a senha temporária não
          for trocada, esta tela fica por cima de tudo. */}
      <ChangePasswordModal />
      <Toast />
    </>
  );
}
