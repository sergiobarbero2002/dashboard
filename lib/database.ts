import { Pool, PoolClient } from 'pg'

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
}

// Función para obtener configuración de base de datos de un grupo de hoteles
export async function getHotelDatabaseConfig(hotelGroupId: string): Promise<DatabaseConfig | null> {
  try {
    const hotelGroupConfigsStr = process.env.HOTEL_GROUP_CONFIGS
    if (!hotelGroupConfigsStr) {
      console.error('HOTEL_GROUP_CONFIGS no está definido en las variables de entorno')
      return null
    }

    const hotelGroupConfigs = JSON.parse(hotelGroupConfigsStr)
    const hotelGroupConfig = hotelGroupConfigs[hotelGroupId]
    
    if (!hotelGroupConfig) {
      console.error(`Grupo de hoteles no encontrado: ${hotelGroupId}`)
      return null
    }

    return hotelGroupConfig.postgres
  } catch (error) {
    console.error('Error getting hotel database config:', error)
    return null
  }
}

// Función para obtener conexión a la base de datos de un hotel específico
export async function getHotelConnection(hotelGroupId: string): Promise<PoolClient | null> {
  try {
    const dbConfig = await getHotelDatabaseConfig(hotelGroupId)
    if (!dbConfig) {
      console.error(`No database config found for hotel group: ${hotelGroupId}`)
      return null
    }

    const pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    const client = await pool.connect()
    return client
  } catch (error) {
    console.error('Error connecting to database:', error)
    return null
  }
}

// Función para ejecutar consultas en la base de datos de un hotel específico
export async function query(hotelGroupId: string, text: string, params?: any[]): Promise<any> {
  const client = await getHotelConnection(hotelGroupId)
  if (!client) {
    throw new Error(`Could not connect to database for hotel group: ${hotelGroupId}`)
  }

  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}
