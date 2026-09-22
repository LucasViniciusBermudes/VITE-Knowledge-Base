import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { MIN_PASSWORD } from "../lib/username.js";

// Tela de troca obrigatória de senha.
//
// Aparece quando `profiles.must_change_password` está ligada — o que acontece
// quando a conta é criada e quando o Admin redefine a senha de alguém. Não tem
// botão de fechar nem fecha clicando fora: a senha atual foi escolhida por
// outra pessoa e circulou por algum canal (WhatsApp, papel, o que for). A única
// saída sem trocar é sair da conta.
//
// Quem realmente troca é a Edge Function: ela grava a senha e desliga a flag no
// mesmo passo. Se a flag fosse gravada daqui, bastava desligá-la pelo console.
export default function ChangePasswordModal() {
  const { currentUser, mustChangePassword, changeOwnPassword, signOut, displayName, showToast } =
    useApp();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!currentUser || !mustChangePassword) return null;

  const handleSubmit = async () => {
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais.");
      return;
    }
    setSaving(true);
    try {
      await changeOwnPassword(password);
      showToast("Senha alterada", "#4dab8c");
    } catch (err) {
      setError(err.message || "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter" && !saving) handleSubmit();
  };

  return (
    <div className="overlay open" style={{ zIndex: 120 }}>
      <div className="modal auth-modal">
        <div className="modal-hdr">
          <span className="modal-title">Crie a sua senha</span>
        </div>

        <p className="auth-hint" style={{ marginTop: 0 }}>
          {displayName ? `Olá, ${displayName}. ` : ""}
          Esta é a sua primeira entrada com a senha que o Admin gerou. Escolha
          agora uma senha só sua — ela precisa ter pelo menos {MIN_PASSWORD}{" "}
          caracteres e ser diferente da atual.
        </p>

        <div className="fi">
          <input
            className="fi-input"
            type="password"
            placeholder="Nova senha"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onEnter}
            autoFocus
          />
        </div>
        <div className="fi">
          <input
            className="fi-input"
            type="password"
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={onEnter}
          />
        </div>

        {error && <div className="auth-error show">{error}</div>}

        <div className="modal-ftr">
          <button className="btn-sec" onClick={signOut} disabled={saving}>
            Sair
          </button>
          <button className="btn-cre" disabled={saving} onClick={handleSubmit}>
            {saving ? "Salvando..." : "Salvar senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
