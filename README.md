# Base de Conhecimento (React + Vite)

Versão em React do app de FAQ interno, usando Supabase para autenticação, banco de dados e armazenamento de anexos.

## Rodando localmente

```bash
npm install
cp .env.example .env      # depois edite o .env com os dados do seu projeto Supabase
npm run dev
```

Abra o endereço que o terminal mostrar (normalmente `http://localhost:5173`).

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor → New query**, cole o conteúdo de `setup.sql` e clique em **Run**.
   Isso cria a tabela `faqs`, as regras de segurança (RLS), o bucket `kb-attachments` para os
   anexos, a função que conta as visualizações e 8 FAQs de exemplo (só se a tabela estiver
   vazia — se você já tem conteúdo, nada é sobrescrito).
3. Em **Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Preencha o `.env`:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon
   ```
5. Se o app estiver rodando, recarregue a página — ele detecta a configuração automaticamente. Se as variáveis não estiverem preenchidas, aparece uma tela de configuração explicando os passos.

## Usuários e login

O campo de login aceita **e-mail ou nome de usuário**:

- As contas do time usam o **e-mail real** da pessoa (`patricia@liguelead.com.br`)
  — é assim que elas entram.
- A conta do **Admin** não tem e-mail real. Ela recebe um endereço interno
  (`admin@kb.liguelead.com.br`), que existe só para o Supabase Auth identificá-la,
  e o login é feito digitando apenas `admin`. Esse é o papel da variável
  `VITE_LOGIN_EMAIL_DOMAIN` no `.env`.

Há dois papéis:

- **Admin** — tudo o que um membro faz, mais a tela **Usuários** (ícone de pessoas
  na barra do topo): criar contas, definir nova senha, promover/rebaixar e excluir.
- **Membro** (Patricia, Felipe, Rauni, Lucas) — pode criar, editar e excluir
  qualquer FAQ, favoritar, fixar, importar e exportar.

Leitura continua livre, sem login.

### Configurando (uma vez)

1. Rode o `setup.sql` (se ainda não rodou) e depois o **`setup-users.sql`** no
   SQL Editor. O segundo cria a tabela `profiles`, a função `is_admin()` e o
   gatilho que gera o perfil junto com a conta.

2. Em **Authentication → Sign In / Providers → Email**, desligue
   **"Allow new users to sign up"** (quem cria conta é o Admin) e também
   **"Confirm email"** — a conta do Admin usa um endereço interno que não recebe
   mensagens, então ela nunca seria confirmada. As contas criadas pela tela de
   Usuários já nascem ativas de qualquer forma.

3. Crie a conta do Admin em **Authentication → Users → Add user**:
   - e-mail: `admin@kb.liguelead.com.br`
   - senha: a que você quiser
   - marque **Auto Confirm User**

   Depois rode no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where username = 'admin';
   ```

4. Publique a Edge Function que gerencia as contas:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref SEU-PROJECT-REF
   supabase functions deploy admin-users
   ```
   A `SUPABASE_SERVICE_ROLE_KEY` já vem injetada no ambiente da função — **nunca**
   coloque essa chave no `.env` do front-end.

5. Entre no app como `admin`, abra **Usuários** e crie as contas de Patricia,
   Felipe, Rauni e Lucas com o e-mail real de cada uma. A senha inicial já vem
   preenchida no padrão `usuario123` (`patricia` → `patricia123`) conforme você
   digita o usuário — basta editar se quiser outra.

   Deixar o campo de e-mail em branco é o que gera uma conta "só de usuário",
   como a do Admin.

### Por que uma Edge Function?

Criar e excluir contas exige a chave `service_role`, que ignora todas as regras de
RLS. Como o Vite embute qualquer variável `VITE_*` no JavaScript final, colocá-la
no front-end entregaria acesso total ao banco para quem abrisse o DevTools. A
função roda no servidor, guarda a chave como secret e revalida pelo JWT se quem
chamou é realmente Admin antes de executar qualquer coisa.

### Alterando e-mail ou senha

No ícone de lápis de cada pessoa, o Admin corrige o e-mail e define uma senha
nova. O botão **Padrão** preenche a senha no formato `usuario123`.

### Senhas

A senha inicial de toda conta nova segue o padrão **nome de usuário + `123`** —
previsível de propósito, para você entregar o acesso sem precisar combinar nada.
Vale pedir que cada um troque no primeiro acesso.

Quem tem e-mail real pode recuperar a senha pelo próprio Supabase, se você
quiser habilitar isso depois. Do jeito que está, a redefinição é sempre feita
pelo Admin na tela de Usuários — inclusive para a conta dele, que não tem
e-mail e por isso não teria como receber o link de recuperação.

## Build para produção

```bash
npm run build
```

Isso gera a pasta `dist/` com os arquivos estáticos finais. Você pode hospedar em qualquer serviço de arquivos estáticos:

- **Vercel**: importe o repositório, ele detecta o Vite automaticamente. O `vercel.json` incluído já configura o redirecionamento necessário para as rotas do app (ex.: `/faq/123`).
- **Netlify**: `npm run build`, publique a pasta `dist`. O arquivo `public/_redirects` já está configurado.
- Qualquer outro host de arquivos estáticos (S3, GitHub Pages, etc.) — só garanta que toda rota (`/faq/:id` etc.) sirva o `index.html`, já que é uma SPA com rotas no cliente.

Lembre-se de configurar as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) no painel do serviço de hospedagem também — elas são "assadas" no build, então precisam estar disponíveis *antes* de rodar `npm run build` lá.

## Estrutura do projeto

```
src/
  lib/            funções puras (cores de categoria, markdown, formatação)
  context/        estado global (FAQs, sessão do usuário, modais, toasts)
  components/      TopBar, Sidebar, FaqCard, DetailView, FaqModal, AuthModal, etc.
  App.jsx          rotas ("/" e "/faq/:id")
  main.jsx         ponto de entrada
setup.sql          script de configuração do banco Supabase
setup-users.sql    perfis, papéis (admin/membro) e políticas de usuários
supabase/functions/admin-users/   Edge Function que cria e remove contas
```

## O que tem aqui

- Login com e-mail/senha (Supabase Auth) — leitura livre, escrita só autenticada
- Anexos e imagens enviados de verdade para o Supabase Storage
- Editor com negrito, itálico, código, listas, links e imagens (com pré-visualização)
- Categorias criadas na hora, com cor gerada automaticamente
- Rotas por FAQ (`/faq/:id`) para compartilhar um link direto
- Exportar/importar a base em JSON
- Tema claro/escuro, layout responsivo com menu lateral em gaveta no celular
- Login por nome de usuário, com papéis de Admin e Membro
- Tela de usuários para o Admin criar contas, trocar senhas e definir papéis
