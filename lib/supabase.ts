import { createClient } from '@supabase/supabase-js'

// Cliente Supabase simple
export const supabase = createClient(
  'https://reqfyvseikyjztmnqjdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcWZ5dnNlaWt5anp0bW5xamR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4NzI5NzAsImV4cCI6MjA1MDQ0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
)

// Función para crear cliente para hotel específico
export function createHotelSupabaseClient(hotelId: string) {
  // Por ahora solo retornamos el cliente principal
  // En el futuro, aquí leerías las credenciales del hotel específico
  return supabase
}
