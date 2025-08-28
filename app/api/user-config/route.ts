import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // ===== AUTENTICACIÓN =====
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = createSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // ===== LECTURA DE CONFIGURACIONES =====
    const userConfigsStr = process.env.USER_CONFIGS
    const hotelGroupConfigsStr = process.env.HOTEL_GROUP_CONFIGS
    const hotelConfigsStr = process.env.HOTEL_CONFIGS

    if (!userConfigsStr || !hotelGroupConfigsStr || !hotelConfigsStr) {
      console.error('Configuraciones no encontradas en variables de entorno')
      return NextResponse.json({ error: 'Configuration not found' }, { status: 500 })
    }

    // Parsear configuraciones JSON
    const userConfigs = JSON.parse(userConfigsStr)
    const hotelGroupConfigs = JSON.parse(hotelGroupConfigsStr)
    const hotelConfigs = JSON.parse(hotelConfigsStr)

    // ===== BUSCAR CONFIGURACIÓN DEL USUARIO =====
    const userConfig = userConfigs[userEmail]
    if (!userConfig) {
      console.warn(`Usuario no encontrado en configuración: ${userEmail}`)
      return NextResponse.json({ error: 'User configuration not found' }, { status: 404 })
    }

    const { tenant_id, full_name, role, profileImage } = userConfig

    // ===== OBTENER CONFIGURACIÓN DEL GRUPO DE HOTELES =====
    const hotelGroupConfig = hotelGroupConfigs[tenant_id]
    if (!hotelGroupConfig) {
      console.error(`Grupo de hoteles no encontrado: ${tenant_id}`)
      return NextResponse.json({ error: 'Hotel group configuration not found' }, { status: 500 })
    }

    const hotelIds = hotelGroupConfig.id || []

    // ===== OBTENER DATOS PÚBLICOS DE HOTELES =====
    const hotelsData = hotelIds.map((hotelId: string) => {
      const hotelConfig = hotelConfigs[hotelId]
      if (!hotelConfig) {
        console.warn(`Configuración de hotel no encontrada: ${hotelId}`)
        return null
      }

      // Solo datos públicos del hotel
      return {
        id: hotelConfig.id,
        name: hotelConfig.name,
        stars: hotelConfig.stars,
        rooms: hotelConfig.rooms,
        location: hotelConfig.location
      }
    }).filter(Boolean) // Eliminar hoteles null

    // ===== RESPUESTA FINAL (SOLO DATOS NO SENSIBLES) =====
    const safeResponse = {
      full_name,
      profileImage,
      role,
      tenant_id,
      hotel_ids: hotelIds,
      hotels: hotelsData
    }

    console.log(`✅ Configuración cargada para usuario: ${userEmail}`)
    console.log(`🏨 Hoteles asignados: ${hotelIds.length}`)
    console.log(`🏢 Tenant ID: ${tenant_id}`)

    return NextResponse.json(safeResponse)

  } catch (error: any) {
    console.error('Error en user-config API:', error)
    
    // No exponer detalles del error al cliente
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
