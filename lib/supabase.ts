import { createClient } from '@supabase/supabase-js'

// Cliente Supabase principal para autenticación
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
)