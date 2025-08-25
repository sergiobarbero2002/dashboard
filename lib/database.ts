import { Pool } from 'pg'
import { getHotelConfig } from './hotel-config'

export function getHotelConnection(hotelId: string) {
  const hotelConfig = getHotelConfig(hotelId)

  if (!hotelConfig) {
    throw new Error(`Hotel connection not found for: ${hotelId}`)
  }

  return new Pool({
    host: hotelConfig.postgres.host,
    port: hotelConfig.postgres.port,
    database: hotelConfig.postgres.database,
    user: hotelConfig.postgres.user,
    password: hotelConfig.postgres.password,
    ssl: hotelConfig.postgres.ssl ? { rejectUnauthorized: false } : false
  })
}

export async function query(hotelId: string, text: string, params: any[] = []) {
  const pool = getHotelConnection(hotelId)

  try {
    const result = await pool.query(text, params)
    return result
  } finally {
    await pool.end()
  }
}
