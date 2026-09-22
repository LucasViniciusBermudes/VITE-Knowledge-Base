import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function AuthModal() {
  const { authModal, setAuthModal, signIn } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (authModal.open) {
      setIdentifier('')
      setPassword('')
      setError('')
    }
  }, [authModal.open])

  const close = () => setAuthModal({ open: false, mode: 'signin' })

  const handleSubmit = async () => {
    setError('')
    if (!identifier.trim() || !password) {
      setError('Preencha o e-mail (ou usuário) e a senha.')
      return
    }
    setSubmitting(true)
    try {
      await signIn(identifier, password)
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  const onEnter = (e) => {
    if (e.key === 'Enter' && !submitting) handleSubmit()
  }

  return (
    <div className={`overlay${authModal.open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal auth-modal">
        <div className="modal-hdr">
          <span className="modal-title">Entrar</span>
          <button className="modal-x" onClick={close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="fi">
          <input
            className="fi-input"
            type="text"
            placeholder="E-mail ou usuário"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={onEnter}
          />
        </div>
        <div className="fi">
          <input
            className="fi-input"
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onEnter}
          />
        </div>

        {error && <div className="auth-error show">{error}</div>}

        <p className="auth-hint">
          As contas são criadas pelo Admin. Esqueceu a senha? Peça para ele gerar uma nova em Usuários.
        </p>

        <div className="modal-ftr">
          <button className="btn-sec" onClick={close}>
            Cancelar
          </button>
          <button className="btn-cre" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
