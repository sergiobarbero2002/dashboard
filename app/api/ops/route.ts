import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Función para convertir PostgresInterval a minutos
    const postgresIntervalToMinutes = (interval: any): number | null => {
      if (!interval || typeof interval !== 'object') return null
      
      const days = interval.days || 0
      const hours = interval.hours || 0
      const minutes = interval.minutes || 0
      const seconds = interval.seconds || 0
      const milliseconds = interval.milliseconds || 0
      
      const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes + (seconds / 60) + (milliseconds / 60000)
      return Math.round(totalMinutes * 10) / 10
    }
    
    // ===== AUTENTICACIÓN =====
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ===== PARÁMETROS =====
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const selectedHotels = searchParams.get('hotels')
    const interval = searchParams.get('interval') || 'auto'
    
    if (!from || !to) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    const tenantId = user.user_metadata?.tenant_id || 'test'
    
    // Procesar hoteles seleccionados
    let hotelIds: string[] = []
    if (selectedHotels) {
      try {
        hotelIds = JSON.parse(selectedHotels)
      } catch (error) {
        console.error('Error parsing selectedHotels:', error)
        hotelIds = []
      }
    }
    
    // Si no hay hoteles seleccionados, usar todos los disponibles
    if (hotelIds.length === 0) {
      // Obtener todos los hoteles del grupo desde la configuración
      const { getHotelIdsByGroup } = await import('@/lib/hotel-config')
      hotelIds = getHotelIdsByGroup(tenantId)
    }
    
    // Verificar qué hoteles tienen datos disponibles
    let hotelsWithData = hotelIds
    
    // Si no hay hoteles seleccionados, usar todos los disponibles
    if (hotelIds.length === 0) {
      const { getHotelIdsByGroup } = await import('@/lib/hotel-config')
      hotelsWithData = getHotelIdsByGroup(tenantId)
    }
    
    // Crear filtro SQL para hotel_id
    const hotelFilter = hotelsWithData.length > 0 
      ? `AND m.hotel_id = ANY($${3})` 
      : ''
    
    // Función helper para usar hotelsWithData en lugar de hotelIds
    const getQueryParams = (from: string, to: string) => [from, to, hotelsWithData]
    
    console.log('🏨 Hoteles seleccionados:', hotelIds)
    console.log('🔍 Filtro SQL:', hotelFilter)
    console.log('📊 Hoteles que se usarán para filtrar:', hotelsWithData)
    console.log('🔧 Función getQueryParams ejemplo:', getQueryParams(from, to))
    console.log('📅 Rango de fechas:', { from, to })
    console.log('📊 Intervalo seleccionado:', interval)
    console.log('🏢 Tenant ID:', tenantId)

    // ===== DEBUG: VERIFICAR DATOS EN LA BASE =====
    try {
      const debugResult = await query(tenantId, `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT hotel_id) as unique_hotels,
          MIN(received_ts) as earliest_date,
          MAX(received_ts) as latest_date,
          array_agg(DISTINCT hotel_id) as available_hotels
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
      `, [from, to])
      
      // Verificar si los hoteles seleccionados tienen datos
      const availableHotels = debugResult.rows[0]?.available_hotels || []
      let hotelsWithData = hotelIds.filter(hotelId => availableHotels.includes(hotelId))
      
      if (hotelsWithData.length === 0) {
        console.log('⚠️ ADVERTENCIA: Los hoteles seleccionados no tienen datos en este rango de fechas')
        console.log('🏨 Hoteles seleccionados:', hotelIds)
        console.log('📊 Hoteles con datos disponibles:', availableHotels)
        console.log('🔍 Rango de fechas:', { from, to })
        
        // Si no hay datos para los hoteles seleccionados, usar todos los disponibles
        hotelsWithData = availableHotels
      }
      

    } catch (error) {
      console.error('❌ Error debug:', error)
    }

    // ===== SECCIÓN 1: RESUMEN GENERAL (KPIs) =====

        // 1. EMAILS TOTALES Y MANUALES
    let emailsResult: any = { rows: [] }
    try {
      emailsResult = await query(tenantId, `
        SELECT
          COUNT(*) AS total_emails,
          COUNT(*) FILTER (WHERE manual_intervention = TRUE) AS emails_manual
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
        ${hotelFilter}
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error emails:', error)
    }

    // 2. TIEMPO MEDIO DE RESPUESTA
    let avgResponseTimeResult: any = { rows: [] }
    try {

      
      avgResponseTimeResult = await query(tenantId, `
        SELECT 
          AVG(m.response_ts - m.received_ts) AS avg_response_interval
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
          AND m.response_ts IS NOT NULL 
          AND m.response_ts > m.received_ts
          ${hotelFilter}
      `, getQueryParams(from, to))
      
      const avgResponseTime = avgResponseTimeResult.rows[0]?.avg_response_interval 
        ? postgresIntervalToMinutes(avgResponseTimeResult.rows[0].avg_response_interval)
        : null

    } catch (error) {
      console.error('❌ Error tiempo respuesta:', error)
    }

    // 3. SLA 10min (PORCENTAJE)
    let sla10minResult: any = { rows: [] }
    try {

      
      sla10minResult = await query(tenantId, `
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(
              (COUNT(*) FILTER (WHERE (m.response_ts - m.received_ts) <= INTERVAL '10 minutes')::decimal / 
               COUNT(*)) * 100, 1
            )
          END AS sla_10min_pct
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
          AND m.response_ts IS NOT NULL 
          AND m.response_ts > m.received_ts
          ${hotelFilter}
      `, getQueryParams(from, to))
      



    } catch (error) {
      console.error('❌ Error SLA 10min:', error)
    }

    // 4. UPSELLING REVENUE TOTAL
    let upsellingRevenueResult: any = { rows: [] }
    try {
      upsellingRevenueResult = await query(tenantId, `
        SELECT 
          COALESCE(SUM(upsell_revenue_eur), 0) AS total_revenue
        FROM mail_analysis a
        JOIN mail_message m ON a.mail_uuid = m.id
        WHERE m.received_ts BETWEEN $1 AND $2
          AND a.upselling_offer = TRUE
          AND a.upsell_accepted = TRUE
          ${hotelFilter}
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error upselling revenue:', error)
    }

    // ===== SECCIÓN 2: RENDIMIENTO IA =====
    
    // 5. VOLUMEN DINÁMICO E INTELIGENTE (con emails automáticos)
    let volumeResult: any = { rows: [] }
    try {
      // Usar el intervalo seleccionado por el usuario o calcular automáticamente si es 'auto'
      let timeInterval: string
      let intervalName: string
      
      if (interval === 'auto') {
        // Calcular la diferencia en días para determinar el intervalo óptimo
        const daysDiff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 7) {
          // Si es una semana o menos, usar intervalos de 1 día
          timeInterval = 'day'
          intervalName = 'Día'
        } else if (daysDiff <= 31) {
          // Si es un mes o menos, usar intervalos de 1 semana
          timeInterval = 'week'
          intervalName = 'Semana'
        } else if (daysDiff <= 90) {
          // Si es un trimestre o menos, usar intervalos de 1 mes
          timeInterval = 'month'
          intervalName = 'Mes'
        } else if (daysDiff <= 365) {
          // Si es un año o menos, usar intervalos de 1 mes
          timeInterval = 'month'
          intervalName = 'Mes'
        } else {
          // Si es más de un año, usar intervalos de 1 año
          timeInterval = 'year'
          intervalName = 'Año'
        }
      } else {
        // Usar el intervalo seleccionado por el usuario
        // Extraer el tipo y la cantidad del intervalo (ej: day2, week3, month2)
        const match = interval.match(/^(\w+)(\d+)$/)
        if (match) {
          const [, type, quantity] = match
          const quantityNum = parseInt(quantity)
          
          timeInterval = type
          switch (type) {
            case 'day':
              intervalName = quantityNum === 1 ? 'Día' : `${quantityNum} Días`
              break
            case 'week':
              intervalName = quantityNum === 1 ? 'Semana' : `${quantityNum} Semanas`
              break
            case 'month':
              intervalName = quantityNum === 1 ? 'Mes' : `${quantityNum} Meses`
              break
            case 'year':
              intervalName = quantityNum === 1 ? 'Año' : `${quantityNum} Años`
              break
            default:
              timeInterval = 'month'
              intervalName = 'Mes'
          }
        } else {
          // Fallback para intervalos simples
          timeInterval = interval
          switch (interval) {
            case 'day':
              intervalName = 'Día'
              break
            case 'week':
              intervalName = 'Semana'
              break
            case 'month':
              intervalName = 'Mes'
              break
            case 'year':
              intervalName = 'Año'
              break
            default:
              timeInterval = 'month'
              intervalName = 'Mes'
          }
        }
      }
      
      console.log(`📊 Usando intervalo: ${timeInterval} (${intervalName})`)
      
      // Construir la consulta según el tipo de intervalo
      let volumeQuery: string = ''
      let queryParams: any[] = []
      
      // Extraer la cantidad del intervalo si existe
      const match = interval.match(/^(\w+)(\d+)$/)
      const intervalQuantity = match ? parseInt(match[2]) : 1
      
      if (timeInterval === 'day') {
        volumeQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                $1::date,
                $2::date,
                INTERVAL '${intervalQuantity} day'
              ) AS interval_start
          ),
          email_counts AS (
            SELECT 
              received_ts,
              COUNT(*) AS total_emails,
              COUNT(*) FILTER (WHERE ai_reply IS NOT NULL AND manual_intervention = FALSE) AS emails_automatic,
              COUNT(*) FILTER (WHERE response_ts IS NULL AND received_ts IS NOT NULL) AS emails_unanswered
            FROM mail_message m
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY received_ts
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ec.total_emails), 0) AS total_emails,
            COALESCE(SUM(ec.emails_automatic), 0) AS emails_automatic,
            COALESCE(SUM(ec.emails_unanswered), 0) AS emails_unanswered,
            'day' AS interval_type,
            '${intervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN email_counts ec ON ec.received_ts >= ti.interval_start 
            AND ec.received_ts < ti.interval_start + INTERVAL '${intervalQuantity} day'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        queryParams = getQueryParams(from, to)
      } else if (timeInterval === 'week') {
        volumeQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('week', $1::date),
                DATE_TRUNC('week', $2::date),
                INTERVAL '${intervalQuantity} week'
              ) AS interval_start
          ),
          email_counts AS (
            SELECT 
              DATE_TRUNC('week', received_ts) AS interval_start,
              COUNT(*) AS total_emails,
              COUNT(*) FILTER (WHERE ai_reply IS NOT NULL AND manual_intervention = FALSE) AS emails_automatic,
              COUNT(*) FILTER (WHERE response_ts IS NULL AND received_ts IS NOT NULL) AS emails_unanswered
            FROM mail_message m
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('week', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ec.total_emails), 0) AS total_emails,
            COALESCE(SUM(ec.emails_automatic), 0) AS emails_automatic,
            COALESCE(SUM(ec.emails_unanswered), 0) AS emails_unanswered,
            'week' AS interval_type,
            '${intervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN email_counts ec ON ec.interval_start >= ti.interval_start 
            AND ec.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} week'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        queryParams = getQueryParams(from, to)
      } else if (timeInterval === 'month') {
        volumeQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('month', $1::date),
                DATE_TRUNC('month', $2::date),
                INTERVAL '${intervalQuantity} month'
              ) AS interval_start
          ),
          email_counts AS (
            SELECT 
              DATE_TRUNC('month', received_ts) AS interval_start,
              COUNT(*) AS total_emails,
              COUNT(*) FILTER (WHERE ai_reply IS NOT NULL AND manual_intervention = FALSE) AS emails_automatic,
              COUNT(*) FILTER (WHERE response_ts IS NULL AND received_ts IS NOT NULL) AS emails_unanswered
            FROM mail_message m
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('month', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ec.total_emails), 0) AS total_emails,
            COALESCE(SUM(ec.emails_automatic), 0) AS emails_automatic,
            COALESCE(SUM(ec.emails_unanswered), 0) AS emails_unanswered,
            'month' AS interval_type,
            '${intervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN email_counts ec ON ec.interval_start >= ti.interval_start 
            AND ec.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} month'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        queryParams = getQueryParams(from, to)
      } else if (timeInterval === 'year') {
        volumeQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('year', $1::date),
                DATE_TRUNC('year', $2::date),
                INTERVAL '${intervalQuantity} year'
              ) AS interval_start
          ),
          email_counts AS (
            SELECT 
              DATE_TRUNC('year', received_ts) AS interval_start,
              COUNT(*) AS total_emails,
              COUNT(*) FILTER (WHERE ai_reply IS NOT NULL AND manual_intervention = FALSE) AS emails_automatic,
              COUNT(*) FILTER (WHERE response_ts IS NULL AND received_ts IS NOT NULL) AS emails_unanswered
            FROM mail_message m
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('year', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ec.total_emails), 0) AS total_emails,
            COALESCE(SUM(ec.emails_automatic), 0) AS emails_automatic,
            COALESCE(SUM(ec.emails_unanswered), 0) AS emails_unanswered,
            'year' AS interval_type,
            '${intervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN email_counts ec ON ec.interval_start >= ti.interval_start 
            AND ec.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} year'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        queryParams = getQueryParams(from, to)
      }
      
      volumeResult = await query(tenantId, volumeQuery, queryParams)

    } catch (error) {
      console.error('❌ Error volumen dinámico:', error)
    }

    // 6. DISTRIBUCIÓN SLA COMPLETA (tramos)
    let slaTramResult: any = { rows: [] }
    try {

      console.log('  📅 Rango fechas:', { from, to })
      console.log('  🏨 Hoteles filtro:', hotelsWithData)
      console.log('  🔍 Filtro SQL:', hotelFilter)
      
      slaTramResult = await query(tenantId, `
        WITH all_tramos AS (
          SELECT '<10min' AS sla_tramo UNION ALL
          SELECT '10min-1h' UNION ALL
          SELECT '1-4h' UNION ALL
          SELECT '4-24h' UNION ALL
          SELECT '>24h'
        ),
        sla_data AS (
          SELECT 
            CASE 
              WHEN (m.response_ts - m.received_ts) <= INTERVAL '10 minutes' THEN '<10min'
              WHEN (m.response_ts - m.received_ts) > INTERVAL '10 minutes' AND (m.response_ts - m.received_ts) <= INTERVAL '1 hour' THEN '10min-1h'
              WHEN (m.response_ts - m.received_ts) > INTERVAL '1 hour' AND (m.response_ts - m.received_ts) <= INTERVAL '4 hours' THEN '1-4h'
              WHEN (m.response_ts - m.received_ts) > INTERVAL '4 hours' AND (m.response_ts - m.received_ts) <= INTERVAL '24 hours' THEN '4-24h'
              ELSE '>24h'
            END AS sla_tramo,
            COUNT(*) AS total
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
          AND m.response_ts IS NOT NULL 
          AND m.response_ts > m.received_ts
          ${hotelFilter}
          GROUP BY 
            CASE 
              WHEN (m.response_ts - m.received_ts) <= INTERVAL '10 minutes' THEN '<10min'
              WHEN (m.response_ts - m.received_ts) > INTERVAL '10 minutes' AND (m.response_ts - m.received_ts) <= INTERVAL '1 hour' THEN '10min-1h'
              WHEN (m.response_ts - m.received_ts) > INTERVAL '1 hour' AND (m.response_ts - m.received_ts) <= INTERVAL '4 hours' THEN '1-4h'
              WHEN (m.response_ts - m.received_ts) > INTERVAL '4 hours' AND (m.response_ts - m.received_ts) <= INTERVAL '24 hours' THEN '4-24h'
              ELSE '>24h'
            END
        )
        SELECT 
          at.sla_tramo,
          COALESCE(sd.total, 0) AS total
        FROM all_tramos at
        LEFT JOIN sla_data sd ON at.sla_tramo = sd.sla_tramo
        ORDER BY 
          CASE at.sla_tramo
            WHEN '<10min' THEN 1
            WHEN '10min-1h' THEN 2
            WHEN '1-4h' THEN 3
            WHEN '4-24h' THEN 4
            WHEN '>24h' THEN 5
          END
      `, getQueryParams(from, to))
      

      
      // Verificar si hay datos para esta consulta
      const checkSlaTramDataResult = await query(tenantId, `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE response_ts IS NOT NULL AND response_ts > received_ts) as messages_with_response,
          COUNT(*) FILTER (WHERE response_ts IS NOT NULL AND response_ts > received_ts AND (response_ts - received_ts) <= INTERVAL '10 minutes') as messages_under_10min,
          COUNT(*) FILTER (WHERE response_ts IS NOT NULL AND response_ts > received_ts AND (response_ts - received_ts) > INTERVAL '10 minutes' AND (response_ts - received_ts) <= INTERVAL '1 hour') as messages_10min_to_1h,
          COUNT(*) FILTER (WHERE response_ts IS NOT NULL AND response_ts > received_ts AND (response_ts - received_ts) > INTERVAL '1 hour' AND (response_ts - received_ts) <= INTERVAL '4 hours') as messages_1h_to_4h,
          COUNT(*) FILTER (WHERE response_ts IS NOT NULL AND response_ts > received_ts AND (response_ts - received_ts) > INTERVAL '4 hours' AND (response_ts - received_ts) <= INTERVAL '24 hours') as messages_4h_to_24h,
          COUNT(*) FILTER (WHERE response_ts IS NOT NULL AND response_ts > received_ts AND (response_ts - received_ts) > INTERVAL '24 hours') as messages_over_24h
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
          ${hotelFilter}
      `, getQueryParams(from, to))
      



    } catch (error) {
      console.error('❌ Error SLA tramos:', error)
    }

    // 7. INTERVENCIÓN MANUAL POR MES
    let manualResult: any = { rows: [] }
    try {
      manualResult = await query(tenantId, `
        SELECT 
          DATE_TRUNC('month', m.received_ts) AS month,
          ROUND(
            (COUNT(*) FILTER (WHERE m.manual_intervention = TRUE)::decimal / COUNT(*)) * 100, 1
          ) AS pct_manual
        FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
        ${hotelFilter}
        GROUP BY DATE_TRUNC('month', m.received_ts)
        ORDER BY 1
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error manual:', error)
    }

    // ===== SECCIÓN 3: CUSTOMER EXPERIENCE =====
    
    // 8. ANÁLISIS DE SENTIMIENTO
    let sentimentResult: any = { rows: [] }
    try {
      sentimentResult = await query(tenantId, `
        SELECT 
          sentiment, 
          COUNT(*) AS total
        FROM mail_analysis a
        JOIN mail_message m ON a.mail_uuid = m.id
        WHERE m.received_ts BETWEEN $1 AND $2
          AND sentiment IS NOT NULL
          ${hotelFilter}
        GROUP BY sentiment
        ORDER BY total DESC
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error sentimiento:', error)
    }

    // 9. IDIOMAS DE COMUNICACIÓN
    let languageResult: any = { rows: [] }
    try {
      languageResult = await query(tenantId, `
        SELECT 
          COALESCE(language, 'Sin clasificar') AS language, 
          COUNT(*) AS total
        FROM mail_analysis a
        JOIN mail_message m ON a.mail_uuid = m.id
        WHERE m.received_ts BETWEEN $1 AND $2
          AND a.language IS NOT NULL
          ${hotelFilter}
        GROUP BY language
        ORDER BY total DESC
        LIMIT 10
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error idiomas:', error)
    }

    // 10. CATEGORÍAS PRINCIPALES
    let categoryResult: any = { rows: [] }
    try {
      categoryResult = await query(tenantId, `
        SELECT 
          COALESCE(main_category, 'Sin categoría') AS main_category, 
          COUNT(*) AS total
        FROM mail_analysis a
        JOIN mail_message m ON a.mail_uuid = m.id
        WHERE m.received_ts BETWEEN $1 AND $2
          AND a.main_category IS NOT NULL
          ${hotelFilter}
        GROUP BY main_category
        ORDER BY total DESC
        LIMIT 10
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error categorías:', error)
    }

    // ===== SECCIÓN 4: UPSELLING =====
    
    // 11. ESTADÍSTICAS GENERALES DE UPSELLING
    let upsellingStatsResult: any = { rows: [] }
    try {
      upsellingStatsResult = await query(tenantId, `
        SELECT 
          COUNT(*) FILTER (WHERE upselling_offer = TRUE) AS offers_sent,
          COUNT(*) FILTER (WHERE upselling_offer = TRUE AND upsell_accepted = TRUE) AS offers_accepted,
          COALESCE(SUM(upsell_revenue_eur), 0) AS total_revenue
        FROM mail_analysis a
        JOIN mail_message m ON a.mail_uuid = m.id
        WHERE m.received_ts BETWEEN $1 AND $2
        ${hotelFilter}
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error upselling:', error)
    }

    // 12. UPSELLING REVENUE POR INTERVALO DINÁMICO
    let upsellingRevenueByIntervalResult: any = { rows: [] }
    try {
      // Usar el mismo intervalo que se definió para volumen
      let revenueTimeInterval: string
      let revenueIntervalName: string
      
      if (interval === 'auto') {
        // Calcular la diferencia en días para determinar el intervalo óptimo
        const daysDiff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 7) {
          revenueTimeInterval = 'day'
          revenueIntervalName = 'Día'
        } else if (daysDiff <= 31) {
          revenueTimeInterval = 'week'
          revenueIntervalName = 'Semana'
        } else if (daysDiff <= 90) {
          revenueTimeInterval = 'month'
          revenueIntervalName = 'Mes'
        } else if (daysDiff <= 365) {
          revenueTimeInterval = 'month'
          revenueIntervalName = 'Mes'
        } else {
          revenueTimeInterval = 'year'
          revenueIntervalName = 'Año'
        }
      } else {
        // Usar el intervalo seleccionado por el usuario
        // Extraer el tipo y la cantidad del intervalo (ej: day2, week3, month2)
        const match = interval.match(/^(\w+)(\d+)$/)
        if (match) {
          const [, type, quantity] = match
          const quantityNum = parseInt(quantity)
          
          revenueTimeInterval = type
          switch (type) {
            case 'day':
              revenueIntervalName = quantityNum === 1 ? 'Día' : `${quantityNum} Días`
              break
            case 'week':
              revenueIntervalName = quantityNum === 1 ? 'Semana' : `${quantityNum} Semanas`
              break
            case 'month':
              revenueIntervalName = quantityNum === 1 ? 'Mes' : `${quantityNum} Meses`
              break
            case 'year':
              revenueIntervalName = quantityNum === 1 ? 'Año' : `${quantityNum} Años`
              break
            default:
              revenueTimeInterval = 'month'
              revenueIntervalName = 'Mes'
          }
        } else {
          // Fallback para intervalos simples
          revenueTimeInterval = interval
          switch (interval) {
            case 'day':
              revenueIntervalName = 'Día'
              break
            case 'week':
              revenueIntervalName = 'Semana'
              break
            case 'month':
              revenueIntervalName = 'Mes'
              break
            case 'year':
              revenueIntervalName = 'Año'
              break
            default:
              revenueTimeInterval = 'month'
              revenueIntervalName = 'Mes'
          }
        }
      }
      
      console.log(`💰 Upselling revenue usando intervalo: ${revenueTimeInterval} (${revenueIntervalName})`)
      
      // Construir la consulta según el tipo de intervalo
      let revenueQuery: string = ''
      let revenueQueryParams: any[] = []
      
      // Extraer la cantidad del intervalo si existe
      const revenueMatch = interval.match(/^(\w+)(\d+)$/)
      const revenueIntervalQuantity = revenueMatch ? parseInt(revenueMatch[2]) : 1
      
      if (revenueTimeInterval === 'day') {
        revenueQuery = `
          WITH time_intervals AS (
            SELECT
              generate_series(
                $1::date,
                $2::date,
                INTERVAL '${revenueIntervalQuantity} day'
              ) AS interval_start
          ),
          revenue_counts AS (
            SELECT 
              m.received_ts,
              COALESCE(SUM(a.upsell_revenue_eur), 0) AS total_revenue
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
              AND a.upselling_offer = TRUE
              AND a.upsell_accepted = TRUE
              ${hotelFilter}
            GROUP BY m.received_ts
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(rc.total_revenue), 0) AS total_revenue,
            'day' AS interval_type,
            '${revenueIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN revenue_counts rc ON rc.received_ts >= ti.interval_start 
            AND rc.received_ts < ti.interval_start + INTERVAL '${revenueIntervalQuantity} day'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        revenueQueryParams = getQueryParams(from, to)
      } else if (revenueTimeInterval === 'week') {
        revenueQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('week', $1::date),
                DATE_TRUNC('week', $2::date),
                INTERVAL '${revenueIntervalQuantity} week'
              ) AS interval_start
          ),
          revenue_counts AS (
            SELECT 
              DATE_TRUNC('week', m.received_ts) AS interval_start,
              COALESCE(SUM(a.upsell_revenue_eur), 0) AS total_revenue
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
              AND a.upselling_offer = TRUE
              AND a.upsell_accepted = TRUE
              ${hotelFilter}
            GROUP BY DATE_TRUNC('week', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(rc.total_revenue), 0) AS total_revenue,
            'week' AS interval_type,
            '${revenueIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN revenue_counts rc ON rc.interval_start >= ti.interval_start 
            AND rc.interval_start < ti.interval_start + INTERVAL '${revenueIntervalQuantity} week'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        revenueQueryParams = getQueryParams(from, to)
      } else if (revenueTimeInterval === 'month') {
        revenueQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('month', $1::date),
                DATE_TRUNC('month', $2::date),
                INTERVAL '${revenueIntervalQuantity} month'
              ) AS interval_start
          ),
          revenue_counts AS (
            SELECT 
              DATE_TRUNC('month', m.received_ts) AS interval_start,
              COALESCE(SUM(a.upsell_revenue_eur), 0) AS total_revenue
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
              AND a.upselling_offer = TRUE
              AND a.upsell_accepted = TRUE
              ${hotelFilter}
            GROUP BY DATE_TRUNC('month', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(rc.total_revenue), 0) AS total_revenue,
            'month' AS interval_type,
            '${revenueIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN revenue_counts rc ON rc.interval_start >= ti.interval_start 
            AND rc.interval_start < ti.interval_start + INTERVAL '${revenueIntervalQuantity} month'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        revenueQueryParams = getQueryParams(from, to)
      } else if (revenueTimeInterval === 'year') {
        revenueQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('year', $1::date),
                DATE_TRUNC('year', $2::date),
                INTERVAL '${revenueIntervalQuantity} year'
              ) AS interval_start
          ),
          revenue_counts AS (
            SELECT 
              DATE_TRUNC('year', m.received_ts) AS interval_start,
              COALESCE(SUM(a.upsell_revenue_eur), 0) AS total_revenue
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
              AND a.upselling_offer = TRUE
              AND a.upsell_accepted = TRUE
              ${hotelFilter}
            GROUP BY DATE_TRUNC('year', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(rc.total_revenue), 0) AS total_revenue,
            'year' AS interval_type,
            '${revenueIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN revenue_counts rc ON rc.interval_start >= ti.interval_start 
            AND rc.interval_start < ti.interval_start + INTERVAL '${revenueIntervalQuantity} year'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        revenueQueryParams = getQueryParams(from, to)
      }
      
      upsellingRevenueByIntervalResult = await query(tenantId, revenueQuery, revenueQueryParams)

    } catch (error) {
      console.error('❌ Error upselling revenue por intervalo:', error)
    }

    // 13. UPSELLING POR INTERVALO DINÁMICO (ofertas y conversión)
    let upsellingByIntervalResult: any = { rows: [] }
    try {
      // Usar el mismo intervalo que se definió para volumen
      let upsellingTimeInterval: string
      let upsellingIntervalName: string
      
      if (interval === 'auto') {
        // Calcular la diferencia en días para determinar el intervalo óptimo
        const daysDiff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 7) {
          upsellingTimeInterval = 'day'
          upsellingIntervalName = 'Día'
        } else if (daysDiff <= 31) {
          upsellingTimeInterval = 'week'
          upsellingIntervalName = 'Semana'
        } else if (daysDiff <= 90) {
          upsellingTimeInterval = 'month'
          upsellingIntervalName = 'Mes'
        } else if (daysDiff <= 365) {
          upsellingTimeInterval = 'month'
          upsellingIntervalName = 'Mes'
        } else {
          upsellingTimeInterval = 'quarter'
          upsellingIntervalName = 'Trimestre'
        }
      } else {
        // Usar el intervalo seleccionado por el usuario
        // Extraer el tipo y la cantidad del intervalo (ej: day2, week3, month2)
        const match = interval.match(/^(\w+)(\d+)$/)
        if (match) {
          const [, type, quantity] = match
          const quantityNum = parseInt(quantity)
          
          upsellingTimeInterval = type
          switch (type) {
            case 'day':
              upsellingIntervalName = quantityNum === 1 ? 'Día' : `${quantityNum} Días`
              break
            case 'week':
              upsellingIntervalName = quantityNum === 1 ? 'Semana' : `${quantityNum} Semanas`
              break
            case 'month':
              upsellingIntervalName = quantityNum === 1 ? 'Mes' : `${quantityNum} Meses`
              break
            case 'year':
              upsellingIntervalName = quantityNum === 1 ? 'Año' : `${quantityNum} Años`
              break
            default:
              upsellingTimeInterval = 'month'
              upsellingIntervalName = 'Mes'
          }
        } else {
          // Fallback para intervalos simples
          upsellingTimeInterval = interval
          switch (interval) {
            case 'day':
              upsellingIntervalName = 'Día'
              break
            case 'week':
              upsellingIntervalName = 'Semana'
              break
            case 'month':
              upsellingIntervalName = 'Mes'
              break
            case 'year':
              upsellingIntervalName = 'Año'
              break
            default:
              upsellingTimeInterval = 'month'
              upsellingIntervalName = 'Mes'
          }
        }
      }
      
      console.log(`📊 Upselling usando intervalo: ${upsellingTimeInterval} (${upsellingIntervalName})`)
      
      // Construir la consulta según el tipo de intervalo
      let upsellingQuery: string = ''
      let upsellingQueryParams: any[] = []
      
      // Extraer la cantidad del intervalo si existe
      const upsellingMatch = interval.match(/^(\w+)(\d+)$/)
      const upsellingIntervalQuantity = upsellingMatch ? parseInt(upsellingMatch[2]) : 1
      
      if (upsellingTimeInterval === 'day') {
        upsellingQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                $1::date,
                $2::date,
                INTERVAL '${upsellingIntervalQuantity} day'
              ) AS interval_start
          ),
          upselling_counts AS (
            SELECT 
              m.received_ts,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE) AS offers_sent,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE AND a.upsell_accepted = TRUE) AS offers_accepted,
              ROUND(
                (COUNT(*) FILTER (WHERE a.upselling_offer = TRUE AND a.upsell_accepted = TRUE)::decimal / 
                 NULLIF(COUNT(*) FILTER (WHERE a.upselling_offer = TRUE), 0)) * 100, 1
              ) AS conversion_rate
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY m.received_ts
        )
        SELECT
            ti.interval_start,
            COALESCE(SUM(uc.offers_sent), 0) AS offers_sent,
            COALESCE(SUM(uc.offers_accepted), 0) AS offers_accepted,
            ROUND(
              (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
               NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
            ) AS conversion_rate,
            'day' AS interval_type,
            '${upsellingIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN upselling_counts uc ON uc.received_ts >= ti.interval_start 
            AND uc.received_ts < ti.interval_start + INTERVAL '${upsellingIntervalQuantity} day'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        upsellingQueryParams = getQueryParams(from, to)
      } else if (upsellingTimeInterval === 'week') {
        upsellingQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('week', $1::date),
                DATE_TRUNC('week', $2::date),
                INTERVAL '${upsellingIntervalQuantity} week'
              ) AS interval_start
          ),
          upselling_counts AS (
            SELECT 
              DATE_TRUNC('week', m.received_ts) AS interval_start,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE) AS offers_sent,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE AND a.upsell_accepted = TRUE) AS offers_accepted,
              ROUND(
                (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
                 NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
              ) AS conversion_rate
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('week', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(uc.offers_sent), 0) AS offers_sent,
            COALESCE(SUM(uc.offers_accepted), 0) AS offers_accepted,
            ROUND(
              (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
               NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
            ) AS conversion_rate,
            'week' AS interval_type,
            '${upsellingIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN upselling_counts uc ON uc.interval_start >= ti.interval_start 
            AND uc.interval_start < ti.interval_start + INTERVAL '${upsellingIntervalQuantity} week'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        upsellingQueryParams = getQueryParams(from, to)
      } else if (upsellingTimeInterval === 'month') {
        upsellingQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('month', $1::date),
                DATE_TRUNC('month', $2::date),
                INTERVAL '${upsellingIntervalQuantity} month'
              ) AS interval_start
          ),
          upselling_counts AS (
            SELECT 
              DATE_TRUNC('month', m.received_ts) AS interval_start,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE) AS offers_sent,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE AND a.upsell_accepted = TRUE) AS offers_accepted,
              ROUND(
                (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
                 NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
              ) AS conversion_rate
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('month', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(uc.offers_sent), 0) AS offers_sent,
            COALESCE(SUM(uc.offers_accepted), 0) AS offers_accepted,
            ROUND(
              (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
               NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
            ) AS conversion_rate,
            'month' AS interval_type,
            '${upsellingIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN upselling_counts uc ON uc.interval_start >= ti.interval_start 
            AND uc.interval_start < ti.interval_start + INTERVAL '${upsellingIntervalQuantity} month'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        upsellingQueryParams = getQueryParams(from, to)
      } else if (upsellingTimeInterval === 'year') {
        upsellingQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('year', $1::date),
                DATE_TRUNC('year', $2::date),
                INTERVAL '${upsellingIntervalQuantity} year'
              ) AS interval_start
          ),
          upselling_counts AS (
            SELECT 
              DATE_TRUNC('year', m.received_ts) AS interval_start,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE) AS offers_sent,
              COUNT(*) FILTER (WHERE a.upselling_offer = TRUE AND a.upsell_accepted = TRUE) AS offers_accepted,
              ROUND(
                (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
                 NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
              ) AS conversion_rate
            FROM mail_analysis a
            JOIN mail_message m ON a.mail_uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('year', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(uc.offers_sent), 0) AS offers_sent,
            COALESCE(SUM(uc.offers_accepted), 0) AS offers_accepted,
            ROUND(
              (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
               NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
            ) AS conversion_rate,
            'year' AS interval_type,
            '${upsellingIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN upselling_counts uc ON uc.interval_start >= ti.interval_start 
            AND uc.interval_start < ti.interval_start + INTERVAL '${upsellingIntervalQuantity} year'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        upsellingQueryParams = getQueryParams(from, to)
      }
      
      upsellingByIntervalResult = await query(tenantId, upsellingQuery, upsellingQueryParams)

    } catch (error) {
      console.error('❌ Error upselling por intervalo:', error)
    }

    // ===== SECCIÓN 5: INCIDENCIAS =====
    
    // 14. ESTADÍSTICAS GENERALES DE INCIDENCIAS
    let incidentsStatsResult: any = { rows: [] }
    try {
      incidentsStatsResult = await query(tenantId, `
        SELECT
          COUNT(*) AS total_incidents,
          COUNT(*) FILTER (WHERE resenya_clicked = TRUE) AS review_clicks,
          ROUND(AVG(delay_gestion_min)) AS avg_management_delay,
          ROUND(AVG(delay_resolucion_min)) AS avg_resolution_delay
        FROM mail_incidencias i
        JOIN mail_message m ON i.uuid = m.id
        WHERE m.received_ts BETWEEN $1 AND $2
        ${hotelFilter}
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error incidencias:', error)
    }

    // 15. INCIDENCIAS POR SUBCATEGORÍA
    let incidenciasPorSubcategoriaResult: any = { rows: [] }
    try {
      console.log('🔍 DEBUG - Consulta incidencias por subcategoría:')
      console.log('  📅 Rango fechas:', { from, to })
      console.log('  🏨 Hoteles filtro:', hotelsWithData)
      console.log('  🔍 Filtro SQL:', hotelFilter)
      
                  incidenciasPorSubcategoriaResult = await query(tenantId, `
              SELECT
                CASE 
                  WHEN a.main_category = 'Incidencia' THEN COALESCE(a.sub_category, 'Sin subcategoría')
                  ELSE a.main_category
                END AS category,
                COUNT(*)::INTEGER AS total
              FROM mail_incidencias i
              JOIN mail_message m ON i.uuid = m.id
              JOIN mail_analysis a ON m.id = a.mail_uuid
              WHERE m.received_ts BETWEEN $1 AND $2
              ${hotelFilter}
              GROUP BY 
                CASE 
                  WHEN a.main_category = 'Incidencia' THEN COALESCE(a.sub_category, 'Sin subcategoría')
                  ELSE a.main_category
                END
              ORDER BY total DESC
              LIMIT 10
            `, getQueryParams(from, to))
      
      // Verificar datos de incidencias
      const checkIncidenciasResult = await query(tenantId, `
        SELECT 
          COUNT(*) as total_incidencias,
          COUNT(DISTINCT a.main_category) as categorias_principales,
          COUNT(DISTINCT CASE WHEN a.main_category = 'Incidencia' THEN a.sub_category END) as subcategorias_incidencia
        FROM mail_incidencias i
        JOIN mail_message m ON i.uuid = m.id
        JOIN mail_analysis a ON m.id = a.mail_uuid
        WHERE m.received_ts BETWEEN $1 AND $2
        ${hotelFilter}
      `, getQueryParams(from, to))

    } catch (error) {
      console.error('❌ Error incidencias por subcategoría:', error)
    }

    // 16. INCIDENCIAS POR INTERVALO DINÁMICO (usando los mismos intervalos que volumen)
    let incidentsByIntervalResult: any = { rows: [] }
    try {
      // Usar el mismo intervalo que se definió para volumen
      let incidentsTimeInterval: string
      let incidentsIntervalName: string
      
      if (interval === 'auto') {
        // Calcular la diferencia en días para determinar el intervalo óptimo
        const daysDiff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 7) {
          incidentsTimeInterval = 'day'
          incidentsIntervalName = 'Día'
        } else if (daysDiff <= 31) {
          incidentsTimeInterval = 'week'
          incidentsIntervalName = 'Semana'
        } else if (daysDiff <= 90) {
          incidentsTimeInterval = 'month'
          incidentsIntervalName = 'Mes'
        } else if (daysDiff <= 365) {
          incidentsTimeInterval = 'month'
          incidentsIntervalName = 'Mes'
        } else {
          incidentsTimeInterval = 'quarter'
          incidentsIntervalName = 'Trimestre'
        }
      } else {
        // Usar el intervalo seleccionado por el usuario
        // Extraer el tipo y la cantidad del intervalo (ej: day2, week3, month2)
        const match = interval.match(/^(\w+)(\d+)$/)
        if (match) {
          const [, type, quantity] = match
          const quantityNum = parseInt(quantity)
          
          incidentsTimeInterval = type
          switch (type) {
            case 'day':
              incidentsIntervalName = quantityNum === 1 ? 'Día' : `${quantityNum} Días`
              break
            case 'week':
              incidentsIntervalName = quantityNum === 1 ? 'Semana' : `${quantityNum} Semanas`
              break
            case 'month':
              incidentsIntervalName = quantityNum === 1 ? 'Mes' : `${quantityNum} Meses`
              break
            case 'year':
              incidentsIntervalName = quantityNum === 1 ? 'Año' : `${quantityNum} Años`
              break
            default:
              incidentsTimeInterval = 'month'
              incidentsIntervalName = 'Mes'
          }
        } else {
          // Fallback para intervalos simples
          incidentsTimeInterval = interval
          switch (interval) {
            case 'day':
              incidentsIntervalName = 'Día'
              break
            case 'week':
              incidentsIntervalName = 'Semana'
              break
            case 'month':
              incidentsIntervalName = 'Mes'
              break
            case 'year':
              incidentsIntervalName = 'Año'
              break
            default:
              incidentsTimeInterval = 'month'
              incidentsIntervalName = 'Mes'
          }
        }
      }
      
      console.log(`🚨 Incidencias usando intervalo: ${incidentsTimeInterval} (${incidentsIntervalName})`)
      
      // Construir la consulta según el tipo de intervalo
      let incidentsQuery: string = ''
      let incidentsQueryParams: any[] = []
      
      // Extraer la cantidad del intervalo si existe
      const incidentsMatch = interval.match(/^(\w+)(\d+)$/)
      const incidentsIntervalQuantity = incidentsMatch ? parseInt(incidentsMatch[2]) : 1
      
      if (incidentsTimeInterval === 'day') {
        incidentsQuery = `
          WITH time_intervals AS (
        SELECT
              generate_series(
                $1::date,
                $2::date,
                INTERVAL '${incidentsIntervalQuantity} day'
              ) AS interval_start
          ),
          incidents_counts AS (
            SELECT 
              m.received_ts,
          COUNT(*) AS total_incidents,
              ROUND(AVG(i.delay_gestion_min)) AS avg_management_delay,
              ROUND(AVG(i.delay_resolucion_min)) AS avg_resolution_delay
        FROM mail_incidencias i
        JOIN mail_message m ON i.uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY m.received_ts
          )
      SELECT 
            ti.interval_start,
            COALESCE(SUM(ic.total_incidents), 0) AS total_incidents,
            ROUND(AVG(ic.avg_management_delay)) AS avg_management_delay,
            ROUND(AVG(ic.avg_resolution_delay)) AS avg_resolution_delay,
            'day' AS interval_type,
            '${incidentsIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN incidents_counts ic ON ic.received_ts >= ti.interval_start 
            AND ic.received_ts < ti.interval_start + INTERVAL '${incidentsIntervalQuantity} day'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        incidentsQueryParams = getQueryParams(from, to)
      } else if (incidentsTimeInterval === 'week') {
        incidentsQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('week', $1::date),
                DATE_TRUNC('week', $2::date),
                INTERVAL '${incidentsIntervalQuantity} week'
              ) AS interval_start
          ),
          incidents_counts AS (
            SELECT 
              DATE_TRUNC('week', m.received_ts) AS interval_start,
              COUNT(*) AS total_incidents,
              ROUND(AVG(i.delay_gestion_min)) AS avg_management_delay,
              ROUND(AVG(i.delay_resolucion_min)) AS avg_resolution_delay
            FROM mail_incidencias i
            JOIN mail_message m ON i.uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('week', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ic.total_incidents), 0) AS total_incidents,
            ROUND(AVG(ic.avg_management_delay)) AS avg_management_delay,
            ROUND(AVG(ic.avg_resolution_delay)) AS avg_resolution_delay,
            'week' AS interval_type,
            '${incidentsIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN incidents_counts ic ON ic.interval_start >= ti.interval_start 
            AND ic.interval_start < ti.interval_start + INTERVAL '${incidentsIntervalQuantity} week'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        incidentsQueryParams = getQueryParams(from, to)
      } else if (incidentsTimeInterval === 'month') {
        incidentsQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('month', $1::date),
                DATE_TRUNC('month', $2::date),
                INTERVAL '${incidentsIntervalQuantity} month'
              ) AS interval_start
          ),
          incidents_counts AS (
            SELECT 
              DATE_TRUNC('month', m.received_ts) AS interval_start,
              COUNT(*) AS total_incidents,
              ROUND(AVG(i.delay_gestion_min)) AS avg_management_delay,
              ROUND(AVG(i.delay_resolucion_min)) AS avg_resolution_delay
            FROM mail_incidencias i
            JOIN mail_message m ON i.uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('month', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ic.total_incidents), 0) AS total_incidents,
            ROUND(AVG(ic.avg_management_delay)) AS avg_management_delay,
            ROUND(AVG(ic.avg_resolution_delay)) AS avg_resolution_delay,
            'month' AS interval_type,
            '${incidentsIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN incidents_counts ic ON ic.interval_start >= ti.interval_start 
            AND ic.interval_start < ti.interval_start + INTERVAL '${incidentsIntervalQuantity} month'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        incidentsQueryParams = getQueryParams(from, to)
      } else if (incidentsTimeInterval === 'year') {
        incidentsQuery = `
          WITH time_intervals AS (
            SELECT 
              generate_series(
                DATE_TRUNC('year', $1::date),
                DATE_TRUNC('year', $2::date),
                INTERVAL '${incidentsIntervalQuantity} year'
              ) AS interval_start
          ),
          incidents_counts AS (
            SELECT 
              DATE_TRUNC('year', m.received_ts) AS interval_start,
              COUNT(*) AS total_incidents,
              ROUND(AVG(i.delay_gestion_min)) AS avg_management_delay,
              ROUND(AVG(i.delay_resolucion_min)) AS avg_resolution_delay
            FROM mail_incidencias i
            JOIN mail_message m ON i.uuid = m.id
            WHERE m.received_ts BETWEEN $1 AND $2
            ${hotelFilter}
            GROUP BY DATE_TRUNC('year', m.received_ts)
          )
          SELECT 
            ti.interval_start,
            COALESCE(SUM(ic.total_incidents), 0) AS total_incidents,
            ROUND(AVG(ic.avg_management_delay)) AS avg_management_delay,
            ROUND(AVG(ic.avg_resolution_delay)) AS avg_resolution_delay,
            'year' AS interval_type,
            '${incidentsIntervalName}' AS interval_name
          FROM time_intervals ti
          LEFT JOIN incidents_counts ic ON ic.interval_start >= ti.interval_start 
            AND ic.interval_start < ti.interval_start + INTERVAL '${incidentsIntervalQuantity} year'
          GROUP BY ti.interval_start
          ORDER BY ti.interval_start
        `
        incidentsQueryParams = getQueryParams(from, to)
      }
      
      incidentsByIntervalResult = await query(tenantId, incidentsQuery, incidentsQueryParams)

    } catch (error) {
      console.error('❌ Error incidencias por intervalo:', error)
    }

    // ===== TRANSFORMACIÓN DE DATOS =====
    
    // Datos para gráficas
    const volumeData = volumeResult.rows.map((row: any) => {
      let displayName: string
      
      // Formatear el nombre según el tipo de intervalo con fechas exactas
      if (row.interval_type === 'day') {
        const startDate = new Date(row.interval_start)
        // Extraer la cantidad del intervalo del nombre (ej: "3 Días" -> 3)
        const intervalMatch = row.interval_name.match(/(\d+)/)
        const dayQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
        const endDate = new Date(startDate.getTime() + (dayQuantity - 1) * 24 * 60 * 60 * 1000)
        displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
      } else if (row.interval_type === 'week') {
        const startDate = new Date(row.interval_start)
        // Extraer la cantidad del intervalo del nombre (ej: "2 Semanas" -> 2)
        const intervalMatch = row.interval_name.match(/(\d+)/)
        const weekQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
        const endDate = new Date(startDate.getTime() + (weekQuantity * 7 - 1) * 24 * 60 * 60 * 1000)
        displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
      } else if (row.interval_type === 'month') {
        const startDate = new Date(row.interval_start)
        displayName = startDate.toLocaleDateString('es-ES', { 
          month: 'short', 
          year: '2-digit' 
        })
      } else if (row.interval_type === 'year') {
        const startDate = new Date(row.interval_start)
        displayName = startDate.getFullYear().toString()
      } else {
        displayName = new Date(row.interval_start).toLocaleDateString('es-ES')
      }
      
      // Calcular fechas de inicio y fin del tramo
      let startDate: string
      let endDate: string
      
      if (row.interval_type === 'day') {
        const start = new Date(row.interval_start)
        // Extraer la cantidad del intervalo del nombre (ej: "3 Días" -> 3)
        const intervalMatch = row.interval_name.match(/(\d+)/)
        const dayQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
        const end = new Date(start.getTime() + (dayQuantity - 1) * 24 * 60 * 60 * 1000)
        startDate = start.toLocaleDateString('es-ES')
        endDate = end.toLocaleDateString('es-ES')
      } else if (row.interval_type === 'week') {
        const start = new Date(row.interval_start)
        // Extraer la cantidad del intervalo del nombre (ej: "2 Semanas" -> 2)
        const intervalMatch = row.interval_name.match(/(\d+)/)
        const weekQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
        const end = new Date(start.getTime() + (weekQuantity * 7 - 1) * 24 * 60 * 60 * 1000)
        startDate = start.toLocaleDateString('es-ES')
        endDate = end.toLocaleDateString('es-ES')
      } else if (row.interval_type === 'month') {
        const start = new Date(row.interval_start)
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
        startDate = start.toLocaleDateString('es-ES')
        endDate = end.toLocaleDateString('es-ES')
      } else if (row.interval_type === 'year') {
        const start = new Date(row.interval_start)
        const end = new Date(start.getFullYear(), 11, 31)
        startDate = start.toLocaleDateString('es-ES')
        endDate = end.toLocaleDateString('es-ES')
      } else {
        startDate = new Date(row.interval_start).toLocaleDateString('es-ES')
        endDate = new Date(row.interval_start).toLocaleDateString('es-ES')
      }
      
      return {
        name: displayName,
        total: parseInt(row.total_emails) || 0,
        automatic: parseInt(row.emails_automatic) || 0,
        unanswered: parseInt(row.emails_unanswered) || 0,
        intervalType: row.interval_type,
        intervalName: row.interval_name,
        startDate: startDate,
        endDate: endDate
      }
    })
    


    const manualData = manualResult.rows.map((row: any) => ({
      name: new Date(row.month).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      value: parseFloat(row.pct_manual) || 0
    }))

    const sentimentData = sentimentResult.rows.map((row: any) => ({
      name: row.sentiment || 'Sin clasificar',
      value: parseInt(row.total),
      color: getSentimentColor(row.sentiment)
    }))

    const languageData = languageResult.rows.map((row: any) => ({
      name: row.language || 'Sin clasificar',
      value: parseInt(row.total),
      color: getLanguageColor(row.language)
    }))

    const categoryData = categoryResult.rows.map((row: any) => ({
      name: row.main_category || 'Sin categoría',
      value: parseInt(row.total),
      color: getCategoryColor(row.main_category)
    }))

    const slaTramData = slaTramResult.rows.map((row: any) => ({
      name: row.sla_tramo,
      value: parseInt(row.total),
      color: getSlaTramColor(row.sla_tramo)
    }))

    // ===== OBJETO FINAL COMPLETO =====
    const data = {
      // ===== KPIs PRINCIPALES =====
      totalEmails: emailsResult.rows.length > 0 ? parseInt(emailsResult.rows[0]?.total_emails || 0) : null,
      emailsManual: emailsResult.rows.length > 0 ? parseInt(emailsResult.rows[0]?.emails_manual || 0) : null,
      avgResponseTime: avgResponseTimeResult.rows.length > 0 ? postgresIntervalToMinutes(avgResponseTimeResult.rows[0]?.avg_response_interval) : null,
      sla10min: sla10minResult.rows.length > 0 ? parseFloat(sla10minResult.rows[0]?.sla_10min_pct || 0) : null,
      upsellingRevenue: upsellingRevenueResult.rows.length > 0 ? parseFloat(upsellingRevenueResult.rows[0]?.total_revenue || 0) : null,
      ahorroEuros: 0, // Se calcula en el frontend
      
      // ===== DATOS PARA GRÁFICAS =====
      volume: volumeData,
      manual: manualData,
      slaTram: slaTramData,
      sentiment: sentimentData,
      language: languageData,
      category: categoryData,
      
      // ===== UPSELLING =====
      upselling: {
        offersSent: upsellingStatsResult.rows.length > 0 ? parseInt(upsellingStatsResult.rows[0]?.offers_sent || 0) : 0,
        offersAccepted: upsellingStatsResult.rows.length > 0 ? parseInt(upsellingStatsResult.rows[0]?.offers_accepted || 0) : 0,
        conversionRate: upsellingStatsResult.rows.length > 0 && upsellingStatsResult.rows[0]?.offers_sent > 0 
          ? (parseInt(upsellingStatsResult.rows[0]?.offers_accepted || 0) / parseInt(upsellingStatsResult.rows[0]?.offers_sent || 1)) * 100 
          : 0
      },
      
      // Revenue de upselling por mes
      upsellingRevenueByMonth: upsellingRevenueByIntervalResult.rows.map((row: any) => {
        let displayName: string
        
        // Formatear el nombre según el tipo de intervalo
        if (row.interval_type === 'day') {
          const startDate = new Date(row.interval_start)
          // Extraer la cantidad del intervalo del nombre (ej: "3 Días" -> 3)
          const intervalMatch = row.interval_name.match(/(\d+)/)
          const dayQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
          const endDate = new Date(startDate.getTime() + (dayQuantity - 1) * 24 * 60 * 60 * 1000)
          displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
        } else if (row.interval_type === 'week') {
          const startDate = new Date(row.interval_start)
          // Extraer la cantidad del intervalo del nombre (ej: "2 Semanas" -> 2)
          const intervalMatch = row.interval_name.match(/(\d+)/)
          const weekQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
          const endDate = new Date(startDate.getTime() + (weekQuantity * 7 - 1) * 24 * 60 * 60 * 1000)
          displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
        } else if (row.interval_type === 'month') {
          const startDate = new Date(row.interval_start)
          displayName = startDate.toLocaleDateString('es-ES', { 
            month: 'short', 
            year: '2-digit' 
          })
        } else if (row.interval_type === 'year') {
          const startDate = new Date(row.interval_start)
          displayName = startDate.getFullYear().toString()
        } else {
          displayName = new Date(row.interval_start).toLocaleDateString('es-ES')
        }
        
        return {
          name: displayName,
          value: parseFloat(row.total_revenue) || 0,
          intervalType: row.interval_type,
          intervalName: row.interval_name
        }
      }),

      // Upselling por intervalo dinámico (ofertas enviadas y conversión)
      upsellingByMonth: upsellingByIntervalResult.rows.map((row: any) => {
        let displayName: string
        
        // Formatear el nombre según el tipo de intervalo
        if (row.interval_type === 'day') {
          const startDate = new Date(row.interval_start)
          // Extraer la cantidad del intervalo del nombre (ej: "3 Días" -> 3)
          const intervalMatch = row.interval_name.match(/(\d+)/)
          const dayQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
          const endDate = new Date(startDate.getTime() + (dayQuantity - 1) * 24 * 60 * 60 * 1000)
          displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
        } else if (row.interval_type === 'week') {
          const startDate = new Date(row.interval_start)
          // Extraer la cantidad del intervalo del nombre (ej: "2 Semanas" -> 2)
          const intervalMatch = row.interval_name.match(/(\d+)/)
          const weekQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
          const endDate = new Date(startDate.getTime() + (weekQuantity * 7 - 1) * 24 * 60 * 60 * 1000)
          displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
        } else if (row.interval_type === 'month') {
          const startDate = new Date(row.interval_start)
          displayName = startDate.toLocaleDateString('es-ES', { 
            month: 'short', 
            year: '2-digit' 
          })
        } else if (row.interval_type === 'year') {
          const startDate = new Date(row.interval_start)
          displayName = startDate.getFullYear().toString()
        } else {
          displayName = new Date(row.interval_start).toLocaleDateString('es-ES')
        }
        
        return {
          name: displayName,
          offersSent: parseInt(row.offers_sent) || 0,
          conversionRate: parseFloat(row.conversion_rate) || 0,
          intervalType: row.interval_type,
          intervalName: row.interval_name
        }
      }),
      
      // ===== INCIDENCIAS =====
      incidencias: {
        total: incidentsStatsResult.rows.length > 0 ? parseInt(incidentsStatsResult.rows[0]?.total_incidents || 0) : 0,
        reviewClicks: incidentsStatsResult.rows.length > 0 ? parseInt(incidentsStatsResult.rows[0]?.review_clicks || 0) : 0,
        avgManagementDelay: incidentsStatsResult.rows.length > 0 ? Math.round(parseFloat(incidentsStatsResult.rows[0]?.avg_management_delay || 0)) : 0,
        avgResolutionDelay: incidentsStatsResult.rows.length > 0 ? Math.round(parseFloat(incidentsStatsResult.rows[0]?.avg_resolution_delay || 0)) : 0,
        incidenciasPorSubcategoria: incidenciasPorSubcategoriaResult.rows.map((row: any) => ({
          name: row.category,
          value: parseInt(row.total)
        })),
        porMes: incidentsByIntervalResult.rows.map((row: any) => {
          let displayName: string
          
          // Formatear el nombre según el tipo de intervalo
          if (row.interval_type === 'day') {
            const startDate = new Date(row.interval_start)
            // Extraer la cantidad del intervalo del nombre (ej: "3 Días" -> 3)
            const intervalMatch = row.interval_name.match(/(\d+)/)
            const dayQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
            const endDate = new Date(startDate.getTime() + (dayQuantity - 1) * 24 * 60 * 60 * 1000)
            displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
          } else if (row.interval_type === 'week') {
            const startDate = new Date(row.interval_start)
            // Extraer la cantidad del intervalo del nombre (ej: "2 Semanas" -> 2)
            const intervalMatch = row.interval_name.match(/(\d+)/)
            const weekQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
            const endDate = new Date(startDate.getTime() + (weekQuantity * 7 - 1) * 24 * 60 * 60 * 1000)
            displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
          } else if (row.interval_type === 'month') {
            const startDate = new Date(row.interval_start)
            displayName = startDate.toLocaleDateString('es-ES', { 
              month: 'short', 
              year: '2-digit' 
            })
          } else if (row.interval_type === 'year') {
            const startDate = new Date(row.interval_start)
            displayName = startDate.getFullYear().toString()
          } else {
            displayName = new Date(row.interval_start).toLocaleDateString('es-ES')
          }
          
          return {
            name: displayName,
            totalIncidents: parseInt(row.total_incidents) || 0,
            avgManagementDelay: Math.round(parseFloat(row.avg_management_delay || 0)),
            avgResolutionDelay: Math.round(parseFloat(row.avg_resolution_delay || 0)),
            intervalType: row.interval_type,
            intervalName: row.interval_name
          }
        })
      }
    }

    // ===== ANÁLISIS COMPLETO =====
    console.log()
    console.log()
    console.log('='.repeat(60))
    console.log('🔍 ANÁLISIS COMPLETO DE DATOS')
    console.log('='.repeat(60))
    
    // Información de rangos de fechas e intervalos
    console.log('📅 RANGOS DE FECHAS E INTERVALOS:')
    console.log(`  • Período: ${from} a ${to}`)
    console.log(`  • Intervalo seleccionado: ${interval}`)
    console.log(`  • Intervalo usado: ${volumeData[0]?.intervalType || 'N/A'} (${volumeData[0]?.intervalName || 'N/A'})`)
    
    // Mostrar información detallada del intervalo
    if (interval !== 'auto') {
      const match = interval.match(/^(\w+)(\d+)$/)
      if (match) {
        const [, type, quantity] = match
        console.log(`  • Tipo: ${type}, Cantidad: ${quantity}`)
      }
    }
    console.log('')
    
    // Datos del período actual
    console.log(`  📧 Emails: ${data.totalEmails} total, ${data.emailsManual} manuales`)
    console.log(`  ⏱️ Tiempo respuesta: ${data.avgResponseTime} min`)
    console.log(`  🎯 SLA 10min: ${data.sla10min}%`)
    console.log(`  💰 Upselling revenue: ${data.upsellingRevenue}€`)
    console.log(`  💼 Upselling: ${data.upselling.offersSent} enviadas, ${data.upselling.offersAccepted} aceptadas`)
    console.log(`  🚨 Incidencias: ${data.incidencias.total} total, ${data.incidencias.reviewClicks} reviews`)
    console.log(`  📊 Volumen: ${volumeResult.rows.length} ${volumeResult.rows[0]?.interval_name?.toLowerCase() || 'períodos'} (intervalo: ${volumeResult.rows[0]?.interval_type || 'N/A'})`)
    console.log(`  ⏰ SLA tramos: ${slaTramResult.rows.map((r: any) => `${r.sla_tramo}:${r.total}`).join(', ')}`)
    console.log(`  👤 Manual: ${manualResult.rows.length} meses`)
    console.log(`  😊 Sentimiento: ${sentimentResult.rows.map((r: any) => `${r.sentiment}:${r.total}`).join(', ')}`)
    console.log(`  🌍 Idiomas: ${languageResult.rows.map((r: any) => `${r.language}:${r.total}`).join(', ')}`)
    console.log(`  📂 Categorías: ${categoryResult.rows.map((r: any) => `${r.main_category}:${r.total}`).join(', ')}`)
    console.log(`  📈 Ups. revenue por mes: ${upsellingRevenueByIntervalResult.rows.length} ${upsellingRevenueByIntervalResult.rows[0]?.interval_name?.toLowerCase() || 'períodos'} (intervalo: ${upsellingRevenueByIntervalResult.rows[0]?.interval_type || 'N/A'})`)
    console.log(`  📊 Ups. por mes: ${upsellingByIntervalResult.rows.length} ${upsellingByIntervalResult.rows[0]?.interval_name?.toLowerCase() || 'períodos'} (intervalo: ${upsellingByIntervalResult.rows[0]?.interval_type || 'N/A'})`)
            console.log(`  📋 Inc. por subcategoría: ${incidenciasPorSubcategoriaResult.rows.map((r: any) => `${r.category}:${r.total}`).join(', ')}`)
    console.log(`  📅 Inc. por mes: ${incidentsByIntervalResult.rows.length} ${incidentsByIntervalResult.rows[0]?.interval_name?.toLowerCase() || 'períodos'} (intervalo: ${incidentsByIntervalResult.rows[0]?.interval_type || 'N/A'})`)
    console.log('')
    console.log('='.repeat(60))
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('❌ Error en API /api/ops:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// ===== FUNCIONES AUXILIARES PARA COLORES =====

function getSentimentColor(sentiment: string): string {
  const colors: { [key: string]: string } = {
    'positive': '#28A745',
    'positivo': '#28A745',
    'negative': '#DC3545',
    'negativo': '#DC3545',
    'neutral': '#6C757D',
    'Sin clasificar': '#6C757D'
  }
  return colors[sentiment?.toLowerCase()] || '#6C757D'
}

function getLanguageColor(language: string): string {
  const colors: { [key: string]: string } = {
    'es': '#007BFF',
    'español': '#007BFF',
    'en': '#28A745',
    'inglés': '#28A745',
    'fr': '#FFC107',
    'francés': '#FFC107',
    'de': '#DC3545',
    'alemán': '#DC3545',
    'it': '#6F42C1',
    'italiano': '#6F42C1',
    'Sin clasificar': '#6C757D'
  }
  return colors[language?.toLowerCase()] || '#6C757D'
}

function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    'reservas': '#007BFF',
    'check-in': '#28A745',
    'checkout': '#28A745',
    'check-out': '#FFC107',
    'servicios': '#DC3545',
    'reclamaciones': '#6F42C1',
    'incidencia': '#E74C3C',
    'Sin categoría': '#6C757D'
  }
  return colors[category?.toLowerCase()] || '#6C757D'
}

function getSlaTramColor(slaTram: string): string {
  const colors: { [key: string]: string } = {
    '<1h': '#28A745',    // Verde - excelente
    '1-4h': '#FFC107',   // Amarillo - bueno
    '4-24h': '#FD7E14',  // Naranja - regular
    '>24h': '#DC3545'    // Rojo - muy malo
  }
  return colors[slaTram] || '#6C757D'
}
