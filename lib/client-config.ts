// Configuración del cliente - NO contiene información sensible
// Este archivo se ejecuta en el navegador

export interface ClientUserConfig {
  id: string
  name: string
  full_name: string
  hotel_group: string
  hotels: string[]
  role: string
  status: string
  profileImage?: string
}

export interface ClientHotelInfo {
  name: string
  stars: number
  rooms: number
  location: string
  type: string
  amenities: string[]
  description: string
}

// Función para obtener configuración del usuario desde el servidor
export async function getUserConfig(email: string): Promise<ClientUserConfig | null> {
  try {
    const response = await fetch(`/api/user-config?email=${encodeURIComponent(email)}`)
    if (!response.ok) return null
    
    const userConfig = await response.json()
    return userConfig
  } catch (error) {
    console.error('Error getting user config:', error)
    return null
  }
}

// Función para obtener información de hoteles desde el servidor
export async function getHotelInfo(hotelId: string): Promise<ClientHotelInfo | null> {
  try {
    const response = await fetch(`/api/hotel-info?hotelId=${encodeURIComponent(hotelId)}`)
    if (!response.ok) return null
    
    const hotelInfo = await response.json()
    return hotelInfo
  } catch (error) {
    console.error('Error getting hotel info:', error)
    return null
  }
}

// Función para obtener hoteles del usuario
export async function getUserHotels(email: string): Promise<string[]> {
  const userConfig = await getUserConfig(email)
  return userConfig?.hotels || []
}

// Función para obtener el grupo de hoteles del usuario
export async function getUserHotelGroup(email: string): Promise<string | null> {
  const userConfig = await getUserConfig(email)
  return userConfig?.hotel_group || null
}
