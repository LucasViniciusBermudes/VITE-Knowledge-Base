export default function SetupScreen() {
  return (
    <div className="setup-screen">
      <div className="setup-box">
        <h1>Vamos configurar sua base de conhecimento</h1>
        <p>
          Este app usa o Supabase para guardar as FAQs, os anexos e as contas de quem pode editar. Faltam alguns
          passos antes de começar a usar:
        </p>
        <ul className="setup-steps">
          <li>
            <span className="setup-num">1</span>
            <div>
              Crie um projeto gratuito em <strong>supabase.com</strong> (ou use um existente).
            </div>
          </li>
          <li>
            <span className="setup-num">2</span>
            <div>
              Abra o <strong>SQL Editor</strong> do projeto e execute o arquivo <code>setup.sql</code> que veio junto
              com este projeto — ele cria a tabela, as permissões de segurança e o espaço de armazenamento dos
              anexos.
            </div>
          </li>
          <li>
            <span className="setup-num">3</span>
            <div>
              Em <strong>Settings → API</strong>, copie a "Project URL" e a chave "anon public".
            </div>
          </li>
          <li>
            <span className="setup-num">4</span>
            <div>
              Copie o arquivo <code>.env.example</code> para <code>.env</code> e preencha:
              <div className="setup-code">{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nVITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON-AQUI`}</div>
            </div>
          </li>
          <li>
            <span className="setup-num">5</span>
            <div>
              Rode <code>npm install</code> (só na primeira vez) e depois <code>npm run dev</code>, ou recarregue a
              página se já estiver rodando.
            </div>
          </li>
        </ul>
        <p style={{ fontSize: 12 }}>
          Dica: em <strong>Authentication → Settings</strong>, você decide se qualquer pessoa pode criar conta
          sozinha ou se só o administrador convida os membros do time (mais detalhes no README).
        </p>
        <div className="setup-actions">
          <button className="btn-cre" onClick={() => window.location.reload()}>
            Já configurei, recarregar
          </button>
        </div>
      </div>
    </div>
  )
}
