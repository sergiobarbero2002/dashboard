import hotelsConfig from '@/config/hotels.json'

export interface HotelInfo {
  name: string
  stars: number
  rooms: number
  location: string
  type: string
  amenities: string[]
  description: string
}

export interface HotelConfig {
  id: string[]
  name: string
  supabase: {
    url: string
    anon_key: string
  }
  postgres: {
    host: string
    port: number
    database: string
    user: string
    password: string
    ssl: boolean
  }
  hotels: Record<string, HotelInfo>
}

type HotelsConfig = {
  [key: string]: HotelConfig
}

export function getHotelConfig(hotelId: string): HotelConfig | null {
  return (hotelsConfig.hotels as HotelsConfig)[hotelId] || null
}

export function getAllHotels(): string[] {
  return Object.keys(hotelsConfig.hotels)
}

export function validateHotelConfig(hotelId: string): boolean {
  const config = getHotelConfig(hotelId)
  return config !== null
}

export function getHotelIdsByGroup(hotelGroupId: string): string[] {
  const config = getHotelConfig(hotelGroupId)
  return config?.id || []
}

export function getHotelInfo(hotelGroupId: string, individualHotelId: string): HotelInfo | null {
  const config = getHotelConfig(hotelGroupId)
  return config?.hotels?.[individualHotelId] || null
}

export function getAllIndividualHotels(): Array<{group: string, id: string, info: HotelInfo}> {
  const result: Array<{group: string, id: string, info: HotelInfo}> = []
  
  Object.entries(hotelsConfig.hotels).forEach(([groupKey, groupConfig]) => {
    Object.entries(groupConfig.hotels).forEach(([hotelKey, hotelInfo]) => {
      result.push({
        group: groupKey,
        id: hotelKey,
        info: hotelInfo
      })
    })
  })
  
  return result
}
