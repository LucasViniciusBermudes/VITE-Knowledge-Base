# 📚 Base de Conhecimento

Uma base de FAQ interna para times, onde qualquer pessoa pode consultar as respostas para as dúvidas mais comuns da empresa e o time mantém o conteúdo sempre atualizado.

A leitura é livre, sem precisar de login. Criar, editar e organizar as FAQs fica com as pessoas do time, e um Admin gerencia quem tem acesso.

## ✨ O que o projeto faz

- 🔎 **Busca e navegação por categorias**, para encontrar respostas rápido.
- ✍️ **Editor de FAQs** com negrito, itálico, código, listas, links e imagens, com pré-visualização.
- 📎 **Anexos e imagens** dentro das respostas.
- 🏷️ **Categorias e tags** criadas na hora, cada categoria com sua cor.
- ⭐ **Favoritos e FAQs fixadas** no topo para o que é mais importante.
- 👁️ **Contador de visualizações**, para saber o que o time mais consulta.
- 🔗 **Link direto** para cada FAQ, fácil de compartilhar.
- 📤 **Exportar e importar** a base inteira em JSON.
- 🌗 **Tema claro e escuro** e layout que funciona bem no celular.
- 🔑 **Login por nome de usuário**, com papéis de Admin e Membro.
- 🛡️ **Gerenciamento de usuários** pelo Admin: criar contas, trocar senhas e definir papéis.
- 📜 **Registro de atividade**, mostrando quem criou, editou ou excluiu cada coisa.

## 🛠️ Tecnologias

- [React](https://react.dev) + [Vite](https://vitejs.dev) no front-end
- [Supabase](https://supabase.com) para banco de dados, login, armazenamento de arquivos e Edge Function
- [Vercel](https://vercel.com) para hospedagem

## 🚀 Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org) (versão LTS)
- Um projeto no [Supabase](https://supabase.com)

### 1. Clone e instale

```bash
git clone https://github.com/LucasViniciusBermudes/VITE-Knowledge-Base.git
cd VITE-Knowledge-Base
npm install
```

### 2. Prepare o banco no Supabase

No **SQL Editor** do seu projeto, rode os scripts que estão na raiz do repositório, nesta ordem:

1. `setup.sql`: cria a tabela de FAQs, as regras de segurança, o espaço para anexos e algumas FAQs de exemplo.
2. `setup-users.sql`: cria os perfis de usuário e os papéis de Admin e Membro.

Depois publique a função que gerencia as contas:

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase functions deploy admin-users
```

### 3. Configure o `.env`

Crie um arquivo `.env` na raiz do projeto com os dados do seu Supabase (em *Project Settings → API Keys* e *Data API*):

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publishable
VITE_LOGIN_EMAIL_DOMAIN=kb.seudominio
```

O `VITE_LOGIN_EMAIL_DOMAIN` é um domínio fictício usado para as contas que entram só com nome de usuário, como a do Admin. Ele não precisa existir.

### 4. Rode

```bash
npm run dev
```

Abra `http://localhost:5173` no navegador. Se algo estiver faltando na configuração, o próprio app mostra uma tela explicando o que fazer.

### Primeiro acesso

Para entrar como Admin, crie a conta `admin@kb.seudominio` em *Authentication → Users* no Supabase (marcando **Auto Confirm User**) e rode no SQL Editor:

```sql
update public.profiles set role = 'admin' where username = 'admin';
```

Depois é só entrar no app digitando `admin` e a senha, e criar as contas do time pela tela de Usuários.

## 📦 Build e deploy

```bash
npm run build
```

Gera a versão de produção na pasta `dist/`. Na Vercel, basta importar o repositório e cadastrar as mesmas variáveis do `.env` em *Settings → Environment Variables*. O `vercel.json` já vem configurado para as rotas do app.

## 📁 Estrutura

```
src/
  components/    telas e componentes da interface
  context/       estado global do app
  lib/           funções auxiliares e cliente do Supabase
supabase/
  functions/     Edge Function de gerenciamento de usuários
setup.sql        estrutura do banco
setup-users.sql  usuários e papéis
```
