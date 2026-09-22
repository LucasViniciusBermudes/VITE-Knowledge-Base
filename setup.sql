-- ============================================================
-- Base de Conhecimento — script de configuração do Supabase
--
-- Como usar:
-- 1. Acesse app.supabase.com e abra seu projeto
-- 2. Vá em "SQL Editor" → "New query"
-- 3. Cole este script inteiro e clique em "Run"
-- ============================================================

-- 1. Tabela principal de FAQs
create table if not exists public.faqs (
  id bigint generated always as identity primary key,
  title text not null,
  question text not null,
  body text not null default '',
  cat text not null,
  tags text[] not null default '{}',
  author text default 'Anônimo',
  author_id uuid references auth.users(id) on delete set null,
  attachments jsonb not null default '[]',
  views integer not null default 0,
  starred boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faqs_cat_idx on public.faqs (cat);
create index if not exists faqs_created_idx on public.faqs (created_at desc);

-- 2. Ativa Row Level Security (obrigatório antes de criar as políticas)
alter table public.faqs enable row level security;

-- 3. Qualquer pessoa pode LER as FAQs (mesmo sem login) — é uma base de
--    conhecimento pública dentro da empresa. Remova/edite esta política se
--    quiser exigir login também para leitura.
drop policy if exists "faqs_select_public" on public.faqs;
create policy "faqs_select_public"
  on public.faqs for select
  using (true);

-- 4. Somente usuários autenticados podem CRIAR
drop policy if exists "faqs_insert_auth" on public.faqs;
create policy "faqs_insert_auth"
  on public.faqs for insert
  to authenticated
  with check (true);

-- 5. Somente usuários autenticados podem EDITAR (qualquer FAQ, não só a própria —
--    pensado para um time interno que mantém a base em conjunto)
drop policy if exists "faqs_update_auth" on public.faqs;
create policy "faqs_update_auth"
  on public.faqs for update
  to authenticated
  using (true)
  with check (true);

-- 6. Somente usuários autenticados podem EXCLUIR
drop policy if exists "faqs_delete_auth" on public.faqs;
create policy "faqs_delete_auth"
  on public.faqs for delete
  to authenticated
  using (true);

-- 7. Mantém "updated_at" sempre atualizado automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists faqs_set_updated_at on public.faqs;
create trigger faqs_set_updated_at
  before update on public.faqs
  for each row
  execute function public.set_updated_at();

-- 8. Bucket de armazenamento para anexos e imagens inseridas no corpo da FAQ
insert into storage.buckets (id, name, public)
values ('kb-attachments', 'kb-attachments', true)
on conflict (id) do nothing;

-- 9. Qualquer pessoa pode VER/baixar os arquivos (o bucket é público)
drop policy if exists "kb_attachments_select_public" on storage.objects;
create policy "kb_attachments_select_public"
  on storage.objects for select
  using (bucket_id = 'kb-attachments');

-- 10. Somente usuários autenticados podem ENVIAR arquivos
drop policy if exists "kb_attachments_insert_auth" on storage.objects;
create policy "kb_attachments_insert_auth"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'kb-attachments');

-- 11. Somente usuários autenticados podem EXCLUIR arquivos
drop policy if exists "kb_attachments_delete_auth" on storage.objects;
create policy "kb_attachments_delete_auth"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'kb-attachments');

-- 12. Contador de visualizações
--
-- Precisa ser uma função porque:
--   a) o RLS só permite UPDATE para autenticados — sem isso, a visualização
--      de quem lê a base sem login nunca era registrada;
--   b) "views = views + 1" no banco é atômico, então dois leitores ao mesmo
--      tempo não sobrescrevem o contador um do outro.
--
-- SECURITY DEFINER faz a função rodar com os privilégios do dono (ignorando o
-- RLS), e o "set search_path = public" evita que alguém redirecione os nomes
-- de tabela por dentro da sessão. Ela só sabe somar 1 em views — não dá para
-- usá-la para alterar mais nada.
create or replace function public.increment_faq_views(faq_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  novo integer;
begin
  update public.faqs
     set views = views + 1
   where id = faq_id
  returning views into novo;

  return novo;
end;
$fn$;

revoke all on function public.increment_faq_views(bigint) from public;
grant execute on function public.increment_faq_views(bigint) to anon, authenticated;

-- Evita que o gatilho de "updated_at" marque a FAQ como editada só porque
-- alguém abriu para ler.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  if new.views is distinct from old.views
     and (to_jsonb(new) - 'views'::text - 'updated_at'::text)
       = (to_jsonb(old) - 'views'::text - 'updated_at'::text)
  then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

-- 13. Conteúdo inicial de exemplo
--
-- Roda apenas se a tabela estiver vazia. Antes isso era feito pelo app, mas o
-- INSERT exige login: se a primeira pessoa a abrir a base não estivesse
-- autenticada, o seed falhava silenciosamente e ela via "Nenhuma FAQ".
-- Se você já tem conteúdo próprio, pode simplesmente apagar este bloco.
insert into public.faqs (title, question, cat, body, tags, author, views, starred, pinned)
select * from (values
  (
    'Política de Home Office',
    'Como funciona a política de home office da empresa?',
    'RH',
    $seed$A empresa adota um modelo híbrido de trabalho. Os colaboradores podem trabalhar remotamente até 3 dias por semana, desde que:

- Tenham aprovação do gestor direto
- Mantenham disponibilidade durante o horário comercial (9h–18h)
- Participem de reuniões presenciais quando convocados
- Possuam infraestrutura adequada (internet estável, ambiente reservado)

Para solicitar, acesse o portal RH > Solicitações > Home Office e preencha o formulário. O prazo de aprovação é de até 3 dias úteis.$seed$,
    array['benefícios', 'onboarding'],
    'Marina Alves', 342, true, true
  ),
  (
    'Normas de Segurança do Trabalho',
    'Quais são as normas de segurança obrigatórias?',
    'Operações',
    $seed$Todos os colaboradores devem seguir as Normas Regulamentadoras (NRs) aplicáveis à sua função.

- NR-1: Disposições Gerais — obrigatório para todos
- NR-6: Equipamentos de Proteção Individual (EPIs)
- NR-17: Ergonomia para trabalho em escritório

O treinamento anual de segurança é obrigatório e realizado pelo departamento de Operações. Em caso de acidente, comunique imediatamente ao gestor e ao RH.$seed$,
    array['segurança', 'compliance'],
    'Fernando Costa', 267, false, false
  ),
  (
    'Solicitação de Reembolso',
    'Qual o processo para solicitar reembolso de despesas?',
    'Financeiro',
    $seed$Para solicitar reembolso de despesas corporativas:

1. Acesse o sistema financeiro em financeiro.empresa.com.br
2. Vá em Reembolsos > Nova Solicitação
3. Anexe a nota fiscal original (PDF ou foto legível)
4. Informe o centro de custo e justificativa da despesa
5. Submeta para aprovação do gestor

O prazo de pagamento após aprovação é de até 5 dias úteis. Despesas acima de R$ 500 requerem aprovação da diretoria.$seed$,
    array['reembolso', 'nota fiscal'],
    'Patrícia Ramos', 215, false, false
  ),
  (
    'Gestão de Logística e Entregas',
    'Como funciona o processo de logística de entregas?',
    'Operações',
    $seed$O processo de logística segue o fluxo:

- Pedido cadastrado no sistema ERP
- Separação e conferência pelo almoxarifado (1–2 dias úteis)
- Despacho via transportadora parceira
- Rastreamento disponível em 24h após o despacho

Para entregas urgentes, utilize o canal prioritário no sistema ou entre em contato com operacoes@empresa.com.br.$seed$,
    array['logística', 'processos'],
    'Juliana Martins', 73, false, false
  ),
  (
    'Processo de Aprovação Orçamentária',
    'Qual o fluxo de aprovação de orçamento para novos projetos?',
    'Financeiro',
    $seed$Todo novo projeto deve passar pelo fluxo de aprovação orçamentária:

1. Elaboração do business case pelo responsável do projeto
2. Análise pelo gestor imediato (3 dias úteis)
3. Validação pela área Financeira (5 dias úteis)
4. Aprovação final pela diretoria (projetos > R$ 50k)

Use o template disponível no SharePoint > Financeiro > Templates. Reuniões de alinhamento ocorrem toda segunda-feira às 14h.$seed$,
    array['orçamento', 'processos'],
    'Roberto Silva', 98, true, false
  ),
  (
    'Solicitação de Equipamentos',
    'Como solicitar novos equipamentos de trabalho?',
    'TI',
    $seed$Para solicitar equipamentos de trabalho:

- Novos colaboradores: solicitação feita automaticamente pelo RH no onboarding
- Substituição/upgrade: abra um chamado em ti.empresa.com.br > Equipamentos
- Equipamentos adicionais: necessitam aprovação do gestor + TI

O prazo de entrega padrão é de 5 a 10 dias úteis. Em caso de urgência, contate o helpdesk pelo ramal 1234.$seed$,
    array['equipamento', 'onboarding'],
    'Carlos Henrique', 156, false, false
  ),
  (
    'Configuração de VPN',
    'Como configurar a VPN corporativa no meu computador?',
    'TI',
    $seed$Para configurar a VPN corporativa:

**Windows:**
1. Baixe o cliente Cisco AnyConnect em ti.empresa.com.br/vpn
2. Instale e abra o aplicativo
3. Servidor: vpn.empresa.com.br
4. Use seu login e senha corporativos

**macOS:**
1. Acesse ti.empresa.com.br/vpn e baixe a versão macOS
2. Siga os mesmos passos acima

Problemas? Contate o helpdesk: ramal 1234 ou ti@empresa.com.br.$seed$,
    array['vpn', 'segurança'],
    'Carlos Henrique', 528, true, false
  ),
  (
    'Período de Férias',
    'Como funciona o processo de solicitação de férias?',
    'RH',
    $seed$O colaborador tem direito a 30 dias corridos de férias após 12 meses de trabalho.

Para solicitar:
1. Acesse o portal RH > Férias > Nova Solicitação
2. Informe o período desejado com pelo menos 30 dias de antecedência
3. Aguarde aprovação do gestor (até 5 dias úteis)
4. As férias podem ser parceladas em até 3 períodos (mínimo 14 dias)

O abono pecuniário (venda de até 10 dias) deve ser solicitado no mesmo momento.$seed$,
    array['férias', 'benefícios'],
    'Marina Alves', 189, false, false
  )
) as seed(title, question, cat, body, tags, author, views, starred, pinned)
where not exists (select 1 from public.faqs);

-- ============================================================
-- Importante sobre login (Authentication → Providers → Email):
--
-- Por padrão o Supabase permite que qualquer pessoa com a chave "anon"
-- crie uma conta (sign up) sozinha. Como qualquer usuário autenticado
-- pode editar/excluir FAQs, decida qual controle faz sentido pra você:
--
--   a) Time pequeno e fechado → em Authentication → Settings, desative
--      "Enable email signups" e crie as contas manualmente em
--      Authentication → Users → Invite user.
--
--   b) Time maior, mas só de um domínio de e-mail → mantenha o signup
--      aberto, mas ative "Confirm email" para evitar contas falsas.
-- ============================================================
