-- ============================================================
-- Base de Conhecimento — usuários, papéis e login por nome
--
-- Rode este script DEPOIS do setup.sql, no SQL Editor do Supabase.
-- Ele não mexe na tabela `faqs` nem nas políticas dela: todos os
-- usuários continuam podendo criar, editar e excluir FAQs. O que
-- muda é que agora existe a noção de "quem é Admin", usada para
-- liberar a tela de gerenciamento de usuários.
-- ============================================================

-- 1. Perfis — uma linha por conta do Supabase Auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- 2. Quem é admin?
--
-- SECURITY DEFINER é obrigatório aqui: se a função lesse `profiles`
-- com as permissões de quem chamou, as políticas abaixo entrariam em
-- recursão infinita (a política de profiles consultando profiles).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3. Políticas de `profiles`
--
-- Leitura: qualquer pessoa logada vê a lista (precisamos dos nomes para
-- exibir autoria). Ninguém que não está logado vê nada.
drop policy if exists "profiles_select_auth" on public.profiles;
create policy "profiles_select_auth"
  on public.profiles for select
  to authenticated
  using (true);

-- Edição: cada um pode ajustar o próprio nome; o Admin pode mexer em todos.
-- A criação e a exclusão de contas NÃO passam por aqui — são feitas pela
-- Edge Function `admin-users`, que usa a service_role.
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- 4. Perfil criado automaticamente junto com a conta
--
-- Lê os dados que a Edge Function (ou o painel do Supabase) coloca em
-- user_metadata. Sem isso, cada conta nova precisaria de um INSERT manual.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, name, role)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'name', initcap(split_part(new.email, '@', 1))),
    case when new.raw_user_meta_data->>'role' = 'admin' then 'admin' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. Backfill — cria o perfil de contas que já existiam antes deste script
insert into public.profiles (id, username, name, role)
select
  u.id,
  lower(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))),
  coalesce(u.raw_user_meta_data->>'name', initcap(split_part(u.email, '@', 1))),
  case when u.raw_user_meta_data->>'role' = 'admin' then 'admin' else 'member' end
from auth.users u
on conflict (id) do nothing;

-- 6. Promova a conta do Admin
--
-- Descomente e ajuste depois de criar a primeira conta pelo painel do
-- Supabase (Authentication → Users → Add user). Sem um admin, a tela de
-- usuários fica inacessível para todos.
--
-- update public.profiles set role = 'admin' where username = 'admin';

-- ============================================================
-- Confira no painel (Authentication → Sign In / Providers → Email):
--
--   • "Confirm email" DESLIGADO — os e-mails são internos
--     (usuario@kb.liguelead.com.br) e não recebem mensagens.
--   • "Allow new users to sign up" DESLIGADO — quem cria conta é o
--     Admin, pela tela de usuários do app.
-- ============================================================
