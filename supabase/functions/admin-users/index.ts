// Edge Function: admin-users
//
// Criar, renomear, trocar senha e excluir contas exige a chave service_role,
// que não pode existir no front-end (ela ignora todo o RLS). Esta função roda
// no servidor, guarda a chave como secret e só executa qualquer ação depois de
// confirmar, pelo JWT de quem chamou, que a pessoa é Admin.
//
// Deploy:
//   supabase functions deploy admin-users
//
// A SUPABASE_SERVICE_ROLE_KEY já vem injetada automaticamente no ambiente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/
const DEFAULT_DOMAIN = Deno.env.get('KB_EMAIL_DOMAIN') || 'kb.liguelead.com.br'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // ── 1. quem está chamando? ──
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Faça login novamente.' }, 401)

    const { data: caller, error: callerError } = await admin.auth.getUser(token)
    if (callerError || !caller?.user) return json({ error: 'Sessão expirada. Entre novamente.' }, 401)

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, username')
      .eq('id', caller.user.id)
      .maybeSingle()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Apenas o Admin pode gerenciar usuários.' }, 403)
    }

    // ── 2. ação ──
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    const domain = DOMAIN_RE.test(String(body?.domain || '')) ? String(body.domain) : DEFAULT_DOMAIN

    const countAdmins = async () => {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
      return count || 0
    }

    if (action === 'list') {
      const { data: profiles, error } = await admin
        .from('profiles')
        .select('id, username, name, role, created_at')
        .order('role', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error

      // last_sign_in_at só existe em auth.users
      const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      const authInfo: Record<string, { email: string | null; last_sign_in_at: string | null }> = {}
      for (const u of authList?.users || []) {
        authInfo[u.id] = { email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null }
      }

      return json({
        users: (profiles || []).map((p) => ({
          ...p,
          email: authInfo[p.id]?.email ?? null,
          last_sign_in_at: authInfo[p.id]?.last_sign_in_at ?? null,
        })),
      })
    }

    if (action === 'create') {
      const username = String(body?.username || '').trim().toLowerCase()
      const name = String(body?.name || '').trim()
      const password = String(body?.password || '')
      const role = body?.role === 'admin' ? 'admin' : 'member'
      const informedEmail = String(body?.email || '').trim().toLowerCase()

      if (informedEmail && !EMAIL_RE.test(informedEmail)) {
        return json({ error: 'E-mail inválido.' }, 400)
      }
      if (!USERNAME_RE.test(username)) {
        return json({ error: 'Usuário: 3 a 20 caracteres, apenas letras, números, ponto, hífen ou _.' }, 400)
      }
      if (!name) return json({ error: 'Informe o nome da pessoa.' }, 400)
      if (password.length < 6) return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400)

      const { data: taken } = await admin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (taken) return json({ error: `O usuário "${username}" já existe.` }, 409)

      // Sem e-mail informado, cai no endereço interno — é o caso do Admin,
      // que entra digitando só "admin".
      const email = informedEmail || `${username}@${domain}`

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // já entra ativa, sem passo de confirmação
        user_metadata: { username, name, role },
      })
      if (error) return json({ error: error.message }, 400)

      return json({ ok: true, id: created.user?.id, username, name, role, email })
    }

    if (action === 'password') {
      const id = String(body?.id || '')
      const password = String(body?.password || '')
      if (!id) return json({ error: 'Usuário não informado.' }, 400)
      if (password.length < 6) return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400)

      const { error } = await admin.auth.admin.updateUserById(id, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'update') {
      const id = String(body?.id || '')
      if (!id) return json({ error: 'Usuário não informado.' }, 400)

      const patch: Record<string, string> = {}
      if (typeof body?.name === 'string' && body.name.trim()) patch.name = body.name.trim()
      if (body?.role === 'admin' || body?.role === 'member') patch.role = body.role

      const newEmail = String(body?.email || '').trim().toLowerCase()
      if (newEmail && !EMAIL_RE.test(newEmail)) return json({ error: 'E-mail inválido.' }, 400)

      if (!Object.keys(patch).length && !newEmail) return json({ error: 'Nada para alterar.' }, 400)

      // Não deixa a base ficar sem nenhum admin
      if (patch.role === 'member') {
        const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle()
        if (target?.role === 'admin' && (await countAdmins()) <= 1) {
          return json({ error: 'Este é o único Admin — promova outra pessoa antes de rebaixá-lo.' }, 409)
        }
      }

      if (Object.keys(patch).length) {
        const { error } = await admin.from('profiles').update(patch).eq('id', id)
        if (error) return json({ error: error.message }, 400)
        // espelha em user_metadata para manter os dois lados coerentes
        await admin.auth.admin.updateUserById(id, { user_metadata: patch })
      }

      if (newEmail) {
        // email_confirm evita que o Supabase exija clique num link antes de
        // liberar o novo endereço para login.
        const { error } = await admin.auth.admin.updateUserById(id, {
          email: newEmail,
          email_confirm: true,
        })
        if (error) return json({ error: error.message }, 400)
      }

      return json({ ok: true })
    }

    if (action === 'delete') {
      const id = String(body?.id || '')
      if (!id) return json({ error: 'Usuário não informado.' }, 400)
      if (id === caller.user.id) return json({ error: 'Você não pode excluir a sua própria conta.' }, 409)

      const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle()
      if (target?.role === 'admin' && (await countAdmins()) <= 1) {
        return json({ error: 'Não é possível excluir o único Admin.' }, 409)
      }

      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) return json({ error: error.message }, 400)
      // O perfil sai junto: profiles.id tem "on delete cascade" para auth.users.
      // As FAQs continuam: author_id vira null e o nome do autor fica gravado em texto.
      return json({ ok: true })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro inesperado no servidor.' }, 500)
  }
})
