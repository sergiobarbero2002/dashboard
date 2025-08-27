import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con privilegios de administrador
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
  process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY!
)
