import { createClient } from '@supabase/supabase-js'

// Función para crear cliente Supabase con privilegios de administrador
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL
  const supabaseKey = process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// Cliente por defecto (solo para compatibilidad, no se usa durante build)
export const supabaseAdmin = createSupabaseAdmin()
