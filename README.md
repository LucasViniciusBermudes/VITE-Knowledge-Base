# 📚 Base de Conhecimento

Aplicação web de FAQ interno para times, feita em **React + Vite** e usando o **Supabase** como back-end (banco de dados, autenticação, armazenamento de arquivos e Edge Function). A leitura das FAQs é livre, sem login; criar, editar e excluir conteúdo exige uma conta do time.

---

## 🧭 Sumário

1. [Funcionalidades](#-funcionalidades)
2. [Tecnologias](#-tecnologias)
3. [Estrutura do projeto](#-estrutura-do-projeto)
4. [Como o banco de dados é organizado](#-como-o-banco-de-dados-é-organizado)
5. [Usuários, papéis e login](#-usuários-papéis-e-login)
6. [Pré-requisitos](#-pré-requisitos)
7. [Configurando o Supabase](#-configurando-o-supabase)
8. [Rodando localmente](#-rodando-localmente)
9. [Deploy na Vercel](#-deploy-na-vercel)
10. [Variáveis de ambiente](#-variáveis-de-ambiente)
11. [Pendências conhecidas](#-pendências-conhecidas)
12. [Solução de problemas](#-solução-de-problemas)

---

## ✨ Funcionalidades

- 🌐 **Leitura pública**: qualquer pessoa com o link vê as FAQs, sem precisar entrar.
- ✍️ **Criação e edição** de FAQs com editor que suporta negrito, itálico, código, listas, links e imagens, com pré-visualização.
- 📎 **Anexos e imagens** enviados de verdade para o Supabase Storage.
- 🏷️ **Categorias** criadas na hora, com cor gerada automaticamente (ou personalizada).
- ⭐ **Tags, favoritos e FAQs fixadas** no topo.
- 👁️ **Contador de visualizações** por FAQ, que funciona inclusive para quem lê sem login.
- 🔗 **Link direto** para cada FAQ (`/faq/:id`), para compartilhar.
- 📤 **Exportar e importar** a base inteira em JSON.
- 🌗 **Tema claro/escuro** e layout responsivo, com menu lateral em gaveta no celular.
- 🔑 **Login por nome de usuário ou e-mail**, com papéis de Admin e Membro.
- 🛡️ **Tela de Usuários** (só Admin): criar contas, trocar senhas, alterar e-mail, promover/rebaixar e excluir.
- 📜 **Registro de atividade** (só Admin): histórico de quem criou, editou ou excluiu FAQs e contas.

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | React 18, React Router 6 |
| Build | Vite 5 |
| Back-end | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Cliente do Supabase | `@supabase/supabase-js` v2 |
| Hospedagem | Vercel (também funciona em Netlify ou qualquer host estático) |

---

## 📁 Estrutura do projeto

```
src/
  App.jsx                 rotas ("/" e "/faq/:id")
  main.jsx                ponto de entrada
  index.css               estilos globais e temas claro/escuro
  context/
    AppContext.jsx        estado global: FAQs, sessão, usuários, modais, toasts
  components/
    TopBar.jsx            barra do topo (busca, login, menu do usuário)
    Sidebar.jsx           menu lateral com categorias e filtros
    ListView.jsx          lista de FAQs
    DetailView.jsx        página de uma FAQ
    FaqCard.jsx           cartão de FAQ na lista
    FaqModal.jsx          criar/editar FAQ
    AuthModal.jsx         tela de login
    UsersModal.jsx        gerenciamento de usuários (Admin)
    LogsModal.jsx         registro de atividade (Admin)
    ChangePasswordModal.jsx  troca da própria senha
    SetupScreen.jsx       tela exibida quando o .env não está configurado
    ...                   Toast, ConfirmModal, SkeletonCard, Layout
  lib/
    supabaseClient.js     cria o cliente do Supabase a partir do .env
    username.js           conversão de nome de usuário para e-mail interno
    markdown.js           renderização do corpo das FAQs
    colors.js             categorias padrão e cores
    format.js             formatação de dados

supabase/
  functions/
    admin-users/index.ts  Edge Function que gerencia as contas

setup.sql                 tabela de FAQs, RLS, bucket de anexos, contador de views
setup-users.sql           perfis, papéis e gatilho de criação de perfil
vercel.json               redireciona todas as rotas para o index.html
public/_redirects         o mesmo, para a Netlify
```

---

## 🗄️ Como o banco de dados é organizado

### Tabelas

| Tabela | Criada por | Para que serve |
|---|---|---|
| `faqs` | `setup.sql` | As FAQs: título, pergunta, corpo, categoria, tags, anexos, views, favorito, fixada |
| `profiles` | `setup-users.sql` | Um perfil por conta: nome de usuário, nome de exibição e papel (`admin` ou `member`) |
| `kb_settings` | ver [Pendências](#-pendências-conhecidas) | Configurações gerais, como categorias padrão ocultadas |
| `kb_category_colors` | ver [Pendências](#-pendências-conhecidas) | Cor escolhida para cada categoria |
| `activity_log` | ver [Pendências](#-pendências-conhecidas) | Registro de atividade exibido para o Admin |

### Funções e gatilhos

- `increment_faq_views(faq_id)`: soma 1 nas visualizações de forma atômica. Roda com privilégios elevados para que leitores sem login também contem visualização, mas só consegue alterar esse campo.
- `set_updated_at()`: atualiza `updated_at` a cada edição, ignorando mudanças que sejam só no contador de views.
- `is_admin()`: diz se o usuário logado é Admin. Usada nas políticas de segurança.
- `handle_new_user()`: gatilho que cria o perfil automaticamente sempre que uma conta nova é criada no Supabase Auth.

### Segurança (RLS)

Todas as tabelas usam Row Level Security:

- **FAQs**: leitura liberada para todos; criar, editar e excluir só para usuários autenticados.
- **Perfis**: visíveis só para quem está logado; cada um edita o próprio nome e o Admin edita todos.
- **Storage** (`kb-attachments`): bucket público para leitura; envio e exclusão só para autenticados.

### Edge Function `admin-users`

Criar, excluir e trocar a senha de outras contas exige a chave `service_role`, que ignora todas as regras de segurança. Como tudo que começa com `VITE_` fica embutido no JavaScript do site, essa chave **nunca** pode ir para o front-end. Por isso essas operações passam por uma Edge Function, que roda no servidor do Supabase, recebe a chave automaticamente e confere pelo token de login se quem chamou é realmente Admin antes de executar qualquer coisa.

---

## 👥 Usuários, papéis e login

### Papéis

- **Admin**: tudo o que um membro faz, mais a tela de **Usuários** e o **Registro de atividade**.
- **Membro**: cria, edita e exclui qualquer FAQ, favorita, fixa, importa e exporta.

### Como funciona o login por nome de usuário

O Supabase Auth só faz login por e-mail. Para permitir entrar digitando só o nome (por exemplo `admin`), o app transforma o nome em um **e-mail interno** no formato `usuario@DOMINIO`, onde o domínio vem da variável `VITE_LOGIN_EMAIL_DOMAIN`.

Esse domínio **não precisa existir**, porque a confirmação por e-mail fica desligada e o Supabase nunca envia nada para esses endereços. O ideal é usar um domínio fictício que ninguém use, como `kb.lucasvinicius`. Evite domínios reais como `gmail.com`, porque os endereços gerados pertenceriam a pessoas de verdade.

Regras para o domínio: só letras minúsculas, números, ponto e hífen; pelo menos um ponto; e a parte final só com letras (mínimo 2).

Contas de pessoas com e-mail real podem usar o e-mail normalmente para entrar. Na tela de Usuários, deixar o campo de e-mail em branco cria uma conta "só de usuário", com o e-mail interno.

### Senhas

A senha inicial sugerida para contas novas segue o padrão **nome de usuário + `123`** (por exemplo `joao` → `joao123`). É previsível de propósito, para facilitar a entrega do acesso, então peça para cada pessoa trocar no primeiro acesso.

---

## 📋 Pré-requisitos

- **Node.js** versão LTS (inclui o npm): baixe em [nodejs.org](https://nodejs.org).
- **Git**.
- Uma conta no **Supabase** e outra na **Vercel** (ou outro host estático).

A Supabase CLI não precisa ser instalada: os comandos abaixo usam `npx`, que baixa e executa a CLI na hora. A instalação global com `npm i -g supabase` não é mais suportada pelo Supabase.

> **Usando Windows e PowerShell?** Se aparecer o erro *"a execução de scripts foi desabilitada neste sistema"*, use `npm.cmd` e `npx.cmd` no lugar de `npm` e `npx`, ou rode uma vez `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. Veja [Solução de problemas](#-solução-de-problemas).

---

## ⚙️ Configurando o Supabase

Faça isso uma vez, num projeto novo do Supabase. A ordem importa.

**1. Crie o projeto** em [supabase.com](https://supabase.com).

**2. Rode o `setup.sql`**
Em *SQL Editor → New query*, cole o conteúdo do arquivo e clique em **Run**. Isso cria a tabela `faqs`, as políticas de segurança, o bucket `kb-attachments`, a função de visualizações e 8 FAQs de exemplo (só se a tabela estiver vazia).

**3. Rode o `setup-users.sql`**
Do mesmo jeito, numa nova query. Isso cria a tabela `profiles`, a função `is_admin()` e o gatilho que gera o perfil de cada conta.

Os dois scripts podem ser executados de novo sem estragar nada, caso algo dê errado no meio.

**4. Ajuste a autenticação**
Em *Authentication → Sign In / Providers → Email*, **desligue**:
- *Allow new users to sign up* (quem cria contas é o Admin);
- *Confirm email* (os e-mails internos não recebem mensagens).

**5. Crie a conta do Admin**
Em *Authentication → Users → Add user*:
- e-mail: `admin@SEU-DOMINIO` (por exemplo `admin@kb.lucasvinicius`);
- senha: a que você quiser;
- marque **Auto Confirm User**.

**6. Promova a conta a Admin**
No SQL Editor:

```sql
update public.profiles set role = 'admin' where username = 'admin';
```

**7. Publique a Edge Function**
No terminal, dentro da pasta do projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase functions deploy admin-users
npx supabase secrets set KB_EMAIL_DOMAIN=SEU-DOMINIO
```

O `project-ref` é o código que aparece na URL do painel (`supabase.com/dashboard/project/SEU-PROJECT-REF`). O último comando alinha o domínio padrão da função com o do `.env`.

**8. Pegue a URL e a chave pública**
- **URL**: *Project Settings → Data API → Project URL*.
- **Chave**: *Project Settings → API Keys → Publishable key* (`sb_publishable_...`). A chave `anon` da aba *Legacy API Keys* também funciona.

> ⚠️ **Nunca** use a chave `service_role` / `secret` no `.env`. Ela dá acesso total ao banco e ficaria exposta no site.

---

## 💻 Rodando localmente

```bash
git clone https://github.com/LucasViniciusBermudes/VITE-Knowledge-Base.git
cd VITE-Knowledge-Base
npm install
```

Crie o arquivo `.env` na raiz do projeto. No Windows, `notepad .env` cria o arquivo com o nome certo (sem virar `.env.txt`):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_LOGIN_EMAIL_DOMAIN=kb.lucasvinicius
```

Depois suba o app:

```bash
npm run dev
```

Abra o endereço mostrado no terminal (normalmente `http://localhost:5173`). Se o `.env` não estiver preenchido, o app mostra uma tela explicando o que falta.

O Vite só lê o `.env` quando inicia, então depois de alterá-lo pare o servidor (Ctrl+C) e rode `npm run dev` de novo.

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarregamento automático |
| `npm run build` | Gera a versão de produção na pasta `dist/` |
| `npm run preview` | Serve a pasta `dist/` localmente para testar o build |

---

## 🚀 Deploy na Vercel

1. Envie o código para o seu repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O Vite é detectado automaticamente.
3. Em *Settings → Environment Variables*, cadastre as três variáveis do `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_LOGIN_EMAIL_DOMAIN`).
4. Faça o deploy.

O `.env` não vai para o GitHub (está no `.gitignore`), por isso as variáveis precisam ser cadastradas na Vercel. Elas são embutidas no momento do build, então **qualquer alteração nelas exige um novo deploy**.

O `vercel.json` já redireciona todas as rotas para o `index.html`, necessário para links como `/faq/123` funcionarem ao abrir direto. Para a Netlify, o `public/_redirects` faz o mesmo papel.

A cada `git push` na branch `main`, a Vercel faz um deploy novo automaticamente.

---

## 🔐 Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` e Vercel | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `.env` e Vercel | Chave pública (publishable ou anon) |
| `VITE_LOGIN_EMAIL_DOMAIN` | `.env` e Vercel | Domínio dos e-mails internos de login |
| `KB_EMAIL_DOMAIN` | Secret da Edge Function | Mesmo domínio, usado como padrão pela função |
| `SUPABASE_SERVICE_ROLE_KEY` | Automática na Edge Function | Injetada pelo Supabase; nunca configure manualmente no front-end |

---

## 🚧 Pendências conhecidas

O código do app usa algumas partes do banco que **não estão nos scripts deste repositório**. O app foi escrito para não quebrar sem elas, mas as funções abaixo ficam limitadas até que sejam criadas:

| O que falta | Efeito sem ela |
|---|---|
| Tabela `kb_settings` | Categorias padrão excluídas voltam a aparecer ao recarregar |
| Tabela `kb_category_colors` | Cores personalizadas de categoria não são salvas (usa as automáticas) |
| Tabela `activity_log` e os gatilhos que a alimentam | O Registro de atividade mostra um erro ao abrir |
| Ação `self-password` na Edge Function | A troca da própria senha pelo menu do usuário não funciona |

O código faz referência a scripts chamados `setup-categories.sql` e `fix-02-senha-e-logs.sql`, que provavelmente existiam no projeto original mas não foram versionados. Para completar o projeto, é preciso recriar esses scripts e atualizar a Edge Function.

---

## 🆘 Solução de problemas

**`npm : O arquivo ... npm.ps1 não pode ser carregado`**
Trava de segurança do PowerShell. Use `npm.cmd` / `npx.cmd`, abra o Prompt de Comando (cmd) em vez do PowerShell, ou libere para o seu usuário com:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**O site abre na tela de configuração**
As variáveis de ambiente não chegaram ao build. Localmente, confira o `.env` e reinicie o `npm run dev`. Na Vercel, confira *Settings → Environment Variables* e faça um novo deploy.

**Build falha com `Could not resolve "../assets/..."`**
Um arquivo importado no código foi apagado ou renomeado. Rode `git status` para ver o que mudou e restaure com `git checkout -- caminho/do/arquivo`, ou remova o `import` correspondente.

**A Vercel continua com erro depois da correção**
Confira no log qual commit está sendo buildado. O botão *Redeploy* reconstrói sempre o mesmo commit daquele deploy; para pegar o código novo, faça `git push` e aguarde o deploy automático, ou use *Create Deployment* com a branch `main`.

**Não consigo entrar como `admin`**
Confira se o e-mail da conta no Supabase é exatamente `admin@` + o valor de `VITE_LOGIN_EMAIL_DOMAIN`, se ela foi criada com *Auto Confirm User* e se o `update ... set role = 'admin'` foi executado.

**A tela de Usuários mostra "Não foi possível falar com o servidor de usuários"**
A Edge Function não foi publicada no projeto atual. Rode `npx supabase functions deploy admin-users`.

**Avisos de `vulnerabilities` ou `install-scripts` no `npm install`**
São apenas alertas e não impedem o funcionamento. `npm audit fix` corrige o que for seguro; evite `npm audit fix --force`, que pode quebrar dependências.
