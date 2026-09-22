import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const BUCKET_NAME = 'kb-attachments'

export function isPlaceholderConfig() {
  return (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes('SEU-PROJETO') ||
    SUPABASE_ANON_KEY.includes('SUA-CHAVE')
  )
}

// Se as credenciais ainda não foram configuradas, `supabase` fica null.
// A tela de configuração (SetupScreen) é exibida antes de qualquer chamada usar isso.
export const supabase = isPlaceholderConfig() ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
