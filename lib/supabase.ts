import { createClient } from '@supabase/supabase-js'
import { getHotelGroupConfigFromServer } from './env-config'

// Cliente Supabase principal para autenticación
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
)

// Función para crear cliente Supabase para un grupo de hoteles específico
export async function createHotelSupabaseClient(hotelGroupId: string) {
  try {
    const hotelGroupConfig = await getHotelGroupConfigFromServer(hotelGroupId)
    if (!hotelGroupConfig) {
      throw new Error(`Hotel group config not found for: ${hotelGroupId}`)
    }

    return createClient(
      hotelGroupConfig.supabase.url,
      hotelGroupConfig.supabase.anon_key
    )
  } catch (error) {
    console.error('Error creating hotel Supabase client:', error)
    // Fallback al cliente principal
    return supabase
  }
}
