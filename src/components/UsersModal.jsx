import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import {
  LOGIN_EMAIL_DOMAIN,
  MIN_PASSWORD,
  USERNAME_RE,
  generatePassword,
  normalizeUsername,
} from "../lib/username.js";
import { formatDate } from "../lib/format.js";

const emptyNew = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "member",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export default function UsersModal() {
  const {
    usersModal,
    setUsersModal,
    adminUsers,
    currentUser,
    isAdmin,
    showToast,
  } = useApp();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [editFor, setEditFor] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPwd, setEditPwd] = useState("");
  const [newUser, setNewUser] = useState(emptyNew);
  const [creating, setCreating] = useState(false);
  // Usuário aguardando confirmação de exclusão (null = nenhum).
  const [confirmDel, setConfirmDel] = useState(null);
  // Senha recém-gerada, mostrada UMA vez para o Admin repassar. Não fica
  // salva em lugar nenhum: some ao fechar o modal.
  const [credential, setCredential] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminUsers("list");
      setUsers(data?.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminUsers]);

  useEffect(() => {
    if (!usersModal) return;
    setNewUser({ ...emptyNew, password: generatePassword() });
    setEditFor(null);
    setConfirmDel(null);
    setCredential(null);
    load();
  }, [usersModal, load]);

  if (!usersModal) return null;

  const close = () => setUsersModal(false);

  // O e-mail interno (usuario@dominio) só é usado quando nenhum e-mail real é
  // informado — o caso do Admin, que entra digitando apenas "admin".
  const isInternal = (email) =>
    !!email && email.endsWith(`@${LOGIN_EMAIL_DOMAIN}`);

  const handleCreate = async () => {
    const username = normalizeUsername(newUser.username);
    const email = newUser.email.trim().toLowerCase();
    if (!newUser.name.trim()) return setError("Informe o nome da pessoa.");
    if (!USERNAME_RE.test(username)) {
      return setError(
        "Usuário: 3 a 20 caracteres, só letras, números, ponto, hífen ou _.",
      );
    }
    if (email && !EMAIL_RE.test(email)) return setError("E-mail inválido.");
    if (newUser.password.length < MIN_PASSWORD)
      return setError(
        `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`,
      );

    setCreating(true);
    setError("");
    try {
      await adminUsers("create", {
        name: newUser.name.trim(),
        email,
        username,
        password: newUser.password,
        role: newUser.role,
      });
      showToast(`Conta de ${newUser.name.trim()} criada`, "#4dab8c");
      // Última chance de ver esta senha: ela não é recuperável depois, e a
      // pessoa vai ser obrigada a trocá-la no primeiro acesso mesmo assim.
      setCredential({
        titulo: `Conta de ${newUser.name.trim()} criada`,
        login: email || `${username} (só o usuário)`,
        senha: newUser.password,
      });
      setNewUser({ ...emptyNew, password: generatePassword() });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user) => {
    const opening = editFor !== user.id;
    setEditFor(opening ? user.id : null);
    setEditEmail(opening && !isInternal(user.email) ? user.email || "" : "");
    setEditPwd("");
    setError("");
  };

  const handleSaveEdit = async (user) => {
    const email = editEmail.trim().toLowerCase();
    const wantsEmail = !!email && email !== (user.email || "");
    const wantsPwd = !!editPwd;

    if (!wantsEmail && !wantsPwd)
      return setError("Altere o e-mail ou a senha antes de salvar.");
    if (wantsEmail && !EMAIL_RE.test(email))
      return setError("E-mail inválido.");
    if (wantsPwd && editPwd.length < MIN_PASSWORD)
      return setError(
        `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`,
      );

    setBusyId(user.id);
    setError("");
    try {
      if (wantsEmail) await adminUsers("update", { id: user.id, email });
      if (wantsPwd)
        await adminUsers("password", { id: user.id, password: editPwd });
      showToast(`Dados de ${user.name} atualizados`, "#4dab8c");
      if (wantsPwd) {
        setCredential({
          titulo: `Senha de ${user.name} redefinida`,
          login: isInternal(user.email)
            ? `${user.username} (só o usuário)`
            : user.email,
          senha: editPwd,
        });
      }
      setEditFor(null);
      setEditPwd("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleRole = async (user) => {
    const nextRole = user.role === "admin" ? "member" : "admin";
    setBusyId(user.id);
    setError("");
    try {
      await adminUsers("update", { id: user.id, role: nextRole });
      showToast(
        nextRole === "admin"
          ? `${user.name} agora é Admin`
          : `${user.name} agora é membro`,
        "#529cca",
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (user) => setConfirmDel(user);

  const doDelete = async () => {
    const user = confirmDel;
    if (!user) return;
    setConfirmDel(null);
    setBusyId(user.id);
    setError("");
    try {
      await adminUsers("delete", { id: user.id });
      showToast("Conta excluída", "#e0554a");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="overlay open"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal users-modal">
        <div className="modal-hdr">
          <span className="modal-title">Usuários</span>
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
          <p className="users-empty">Só o Admin pode gerenciar usuários.</p>
        ) : (
          <>
            {error && <div className="auth-error show">{error}</div>}

            {/* Duas colunas: à esquerda o formulário de nova conta, à direita
                a lista de quem já existe. A ordem no HTML é a inversa — a
                lista vem antes — e o CSS coloca cada uma no seu lado; assim,
                quando a tela é estreita e as colunas viram uma só, a lista
                aparece primeiro, que é o que interessa em um celular. */}
            <div className="users-cols">
              {/* A caixa de credencial ocupa a largura toda: ela aparece uma
                  vez só, logo depois de criar a conta, e não pode passar
                  despercebida. */}
              {credential && (
                <div className="cred-box">
                  <div className="cred-title">{credential.titulo}</div>
                  <div className="cred-row">
                    <span className="cred-label">Entra com</span>
                    <code>{credential.login}</code>
                  </div>
                  <div className="cred-row">
                    <span className="cred-label">Senha</span>
                    <code className="cred-pwd">{credential.senha}</code>
                    <button
                      className="btn-sec"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(credential.senha)
                          .then(() => showToast("Senha copiada", "#4dab8c"))
                          .catch(() =>
                            showToast("Não foi possível copiar", "#e0554a"),
                          );
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="cred-note">
                    Anote agora: esta senha não aparece de novo. Ela vale só
                    para o primeiro acesso — a pessoa vai definir a dela ao
                    entrar.
                  </p>
                </div>
              )}

              <div className="users-col users-col-list">
                <div className="fl">
                  Contas
                  {!loading && users.length > 0 ? ` (${users.length})` : ""}
                </div>
                {loading ? (
                  <p className="users-empty">Carregando...</p>
                ) : (
                  <div className="users-list">
                    {users.map((u) => (
                      <div className="user-row" key={u.id}>
                        <span className="user-avatar">
                          {(u.name || u.username).charAt(0).toUpperCase()}
                        </span>
                        <div className="user-row-main">
                          <div className="user-row-name">
                            {u.name}
                            {u.id === currentUser?.id && (
                              <span className="user-you">você</span>
                            )}
                          </div>
                          <div className="user-row-sub">
                            {isInternal(u.email)
                              ? `entra como @${u.username}`
                              : u.email}
                            {u.last_sign_in_at
                              ? ` · último acesso ${formatDate(u.last_sign_in_at)}`
                              : " · nunca acessou"}
                            {u.must_change_password && (
                              <span className="pwd-pending">
                                senha temporária
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`role-badge${u.role === "admin" ? " admin" : ""}`}
                        >
                          {u.role === "admin" ? "Admin" : "Membro"}
                        </span>
                        <div className="user-actions">
                          <button
                            className="uact"
                            title="Alterar e-mail ou senha"
                            disabled={busyId === u.id}
                            onClick={() => openEdit(u)}
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
                            className="uact"
                            title={
                              u.id === currentUser?.id && u.role === "admin"
                                ? "Você não pode remover o seu próprio acesso de Admin"
                                : u.role === "admin"
                                  ? "Rebaixar para membro"
                                  : "Promover a Admin"
                            }
                            disabled={
                              busyId === u.id ||
                              // O Admin não se rebaixa: sem ninguém para promovê-lo
                              // de volta, seria um caminho sem volta pelo app. A
                              // Edge Function recusa isso de qualquer forma; aqui o
                              // botão nem fica clicável.
                              (u.id === currentUser?.id && u.role === "admin")
                            }
                            onClick={() => handleToggleRole(u)}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill={
                                u.role === "admin" ? "currentColor" : "none"
                              }
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                          </button>
                          <button
                            className="uact del"
                            title="Excluir conta"
                            disabled={
                              busyId === u.id || u.id === currentUser?.id
                            }
                            onClick={() => handleDelete(u)}
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
                        </div>

                        {editFor === u.id && (
                          <div className="edit-rows">
                            <input
                              className="fi-input"
                              type="email"
                              placeholder={
                                isInternal(u.email)
                                  ? "Definir um e-mail real (opcional)"
                                  : "Novo e-mail"
                              }
                              autoCapitalize="none"
                              spellCheck="false"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                            <div className="pwd-row">
                              <input
                                className="fi-input"
                                type="text"
                                placeholder="Nova senha (deixe vazio para manter)"
                                autoComplete="off"
                                value={editPwd}
                                onChange={(e) => setEditPwd(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleSaveEdit(u)
                                }
                              />
                              <button
                                className="btn-sec"
                                title="Gerar uma senha aleatória"
                                onClick={() => setEditPwd(generatePassword())}
                              >
                                Gerar
                              </button>
                              <button
                                className="btn-cre"
                                disabled={busyId === u.id}
                                onClick={() => handleSaveEdit(u)}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="users-col users-col-form">
                <div className="fl">Nova conta</div>
                <div className="user-new">
                  <input
                    className="fi-input"
                    type="text"
                    placeholder="Nome (ex.: Patricia)"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser((n) => ({ ...n, name: e.target.value }))
                    }
                  />
                  <input
                    className="fi-input"
                    type="email"
                    placeholder="E-mail (ex.: patricia@liguelead.com.br)"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser((n) => ({ ...n, email: e.target.value }))
                    }
                  />
                  <input
                    className="fi-input"
                    type="text"
                    placeholder="Usuário (ex.: patricia)"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser((n) => ({ ...n, username: e.target.value }))
                    }
                  />
                  <div className="pwd-row">
                    <input
                      className="fi-input"
                      type="text"
                      placeholder="Senha inicial"
                      autoComplete="off"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser((n) => ({ ...n, password: e.target.value }))
                      }
                    />
                    <button
                      className="btn-sec"
                      title="Gerar outra senha"
                      onClick={() => {
                        setNewUser((n) => ({
                          ...n,
                          password: generatePassword(),
                        }));
                      }}
                    >
                      Gerar
                    </button>
                  </div>
                  <select
                    className="f-select"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser((n) => ({ ...n, role: e.target.value }))
                    }
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <p className="auth-hint">
                  Com e-mail preenchido, a pessoa entra pelo e-mail e senha.
                  Deixando em branco, a conta usa o endereço interno{" "}
                  <code>
                    {normalizeUsername(newUser.username) || "usuario"}@
                    {LOGIN_EMAIL_DOMAIN}
                  </code>{" "}
                  e o login é feito digitando só o usuário — é o caso da conta
                  do Admin. A senha inicial é gerada aleatoriamente e serve
                  apenas para o primeiro acesso: ao entrar, a pessoa é obrigada
                  a definir a dela.
                </p>
              </div>
            </div>

            <div className="modal-ftr">
              <button className="btn-sec" onClick={close}>
                Fechar
              </button>
              <button
                className="btn-cre"
                disabled={creating}
                onClick={handleCreate}
              >
                {creating ? "Criando..." : "Criar conta"}
              </button>
            </div>
          </>
        )}
      </div>

      {confirmDel && (
        <div
          className="overlay open"
          style={{ zIndex: 110 }}
          onClick={(e) => e.target === e.currentTarget && setConfirmDel(null)}
        >
          <div className="modal confirm-modal">
            <div className="modal-hdr">
              <span className="modal-title">Excluir conta</span>
            </div>
            <p>
              Excluir a conta de <strong>{confirmDel.name}</strong>?
              <br />
              As FAQs criadas por ela continuam na base.
            </p>
            <div className="confirm-ftr">
              <button className="btn-sec" onClick={() => setConfirmDel(null)}>
                Cancelar
              </button>
              <button
                className="btn-cre"
                style={{ background: "#e0554a", color: "#fff" }}
                onClick={doDelete}
              >
                Excluir conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
