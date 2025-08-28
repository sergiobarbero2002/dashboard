import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSentimentColor, getLanguageColor, getCategoryColor, getSlaTramColor } from '@/lib/chart-colors'

// ===== FUNCIONES AUXILIARES =====

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

// Función para calcular variación porcentual entre dos valores
const calculateVariation = (current: number, previous: number): { percentage: number; isIncrease: boolean } | null => {
  // Si ambos valores son 0, no hay variación
  if (current === 0 && previous === 0) return null
  
  // Si el valor anterior es 0 pero el actual no, es un aumento del 100%
  if (previous === 0 && current > 0) {
    return { percentage: 100, isIncrease: true }
  }
  
  // Si el valor actual es 0 pero el anterior no, es una disminución del 100%
  if (current === 0 && previous > 0) {
    return { percentage: 100, isIncrease: false }
  }
  
  // Cálculo normal de variación
  const variation = ((current - previous) / previous) * 100
  return { 
    percentage: Math.round(Math.abs(variation) * 10) / 10, 
    isIncrease: variation > 0 
  }
}

// Función para calcular ahorro en personal (proporcional a total emails)
const calculatePersonalSavings = (totalEmails: number, minutesPerEmail: number = 5, hourlyRate: number = 25): number => {
  const totalMinutes = totalEmails * minutesPerEmail
  const totalHours = totalMinutes / 60
  const savings = totalHours * hourlyRate
  return Math.round(savings * 100) / 100
}

// Función para calcular satisfacción del cliente basada en sentimientos
const calculateCustomerSatisfaction = (sentimentData: any[]): number => {
  if (sentimentData.length === 0) return 0
  
  let totalEmails = 0
  let weightedSum = 0
  
  sentimentData.forEach((row: any) => {
    const count = parseInt(row.total)
    totalEmails += count
    
    // Ponderación: Muy Positivo=1, Positivo=0.75, Medio=0.5, Negativo=0.25, Muy Negativo=0
    let weight = 0
    switch (row.sentiment) {
      case 'Muy Positivo':
        weight = 1
        break
      case 'Positivo':
        weight = 0.75
        break
      case 'Medio':
        weight = 0.5
        break
      case 'Negativo':
        weight = 0.25
        break
      case 'Muy Negativo':
        weight = 0
        break
      default:
        weight = 0.5 // Valor por defecto para sentimientos no reconocidos
    }
    
    weightedSum += count * weight
  })
  
  if (totalEmails > 0) {
    return Math.round((weightedSum / totalEmails) * 5 * 100) / 100
  }
  
  return 0
}

// Función para determinar el intervalo óptimo basado en el rango de fechas
const getOptimalInterval = (from: string, to: string, userInterval: string = 'auto') => {
  if (userInterval !== 'auto') {
    const match = userInterval.match(/^(\w+)(\d+)$/)
    if (match) {
      const [, type, quantity] = match
      const quantityNum = parseInt(quantity)
      
      const intervalTypes = {
        day: ['Día', 'Días'],
        week: ['Semana', 'Semanas'], 
        month: ['Mes', 'Meses'],
        year: ['Año', 'Años']
      }
      
      const [singular, plural] = intervalTypes[type as keyof typeof intervalTypes] || ['Mes', 'Meses']
      const intervalName = quantityNum === 1 ? singular : `${quantityNum} ${plural}`
      
      return { type, quantity: quantityNum, name: intervalName }
    }
    
    // Fallback para intervalos simples
    const intervalTypes = {
      day: 'Día',
      week: 'Semana',
      month: 'Mes',
      year: 'Año'
    }
    return { type: userInterval, quantity: 1, name: intervalTypes[userInterval as keyof typeof intervalTypes] || 'Mes' }
  }
  
  // Cálculo automático basado en días
  const daysDiff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 7) return { type: 'day', quantity: 1, name: 'Día' }
  if (daysDiff <= 31) return { type: 'week', quantity: 1, name: 'Semana' }
  if (daysDiff <= 365) return { type: 'month', quantity: 1, name: 'Mes' }
  return { type: 'year', quantity: 1, name: 'Año' }
}

// Función para generar consulta SQL de volumen por intervalo
const generateVolumeQuery = (intervalType: string, intervalQuantity: number, hotelFilter: string) => {
  const timeUnit = intervalType === 'day' ? 'day' : 
                   intervalType === 'week' ? 'week' : 
                   intervalType === 'month' ? 'month' : 'year'
  
  return `
    WITH time_intervals AS (
      SELECT 
        ${intervalType === 'day' ? 
          `generate_series($1::date, $2::date, INTERVAL '${intervalQuantity} day')` :
          `generate_series(DATE_TRUNC('${timeUnit}', $1::date), DATE_TRUNC('${timeUnit}', $2::date), INTERVAL '${intervalQuantity} ${timeUnit}')`
        } AS interval_start
    ),
    email_counts AS (
      SELECT 
        DATE_TRUNC('${intervalType}', received_ts) AS interval_start,
        COUNT(*) AS total_emails,
        COUNT(*) FILTER (WHERE ai_reply IS NOT NULL AND manual_intervention = FALSE) AS emails_automatic,
        COUNT(*) FILTER (WHERE response_ts IS NULL AND received_ts IS NOT NULL) AS emails_unanswered
      FROM mail_message m
      WHERE m.received_ts BETWEEN $1 AND $2
      ${hotelFilter}
      GROUP BY DATE_TRUNC('${intervalType}', m.received_ts)
    )
    SELECT 
      ti.interval_start,
      COALESCE(SUM(ec.total_emails), 0) AS total_emails,
      COALESCE(SUM(ec.emails_automatic), 0) AS emails_automatic,
      COALESCE(SUM(ec.emails_unanswered), 0) AS emails_unanswered,
      '${intervalType}' AS interval_type,
      '${intervalType === 'day' ? intervalQuantity === 1 ? 'Día' : `${intervalQuantity} Días` :
        intervalType === 'week' ? intervalQuantity === 1 ? 'Semana' : `${intervalQuantity} Semanas` :
        intervalType === 'month' ? intervalQuantity === 1 ? 'Mes' : `${intervalQuantity} Meses` :
        intervalQuantity === 1 ? 'Año' : `${intervalQuantity} Años`}' AS interval_name
    FROM time_intervals ti
    LEFT JOIN email_counts ec ON ec.interval_start >= ti.interval_start 
      AND ec.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} ${timeUnit}'
    GROUP BY ti.interval_start
    ORDER BY ti.interval_start
  `
}

// Función para generar consulta SQL de revenue por intervalo
const generateRevenueQuery = (intervalType: string, intervalQuantity: number, hotelFilter: string) => {
  const timeUnit = intervalType === 'day' ? 'day' : 
                   intervalType === 'week' ? 'week' : 
                   intervalType === 'month' ? 'month' : 'year'
  
  return `
    WITH time_intervals AS (
      SELECT 
        ${intervalType === 'day' ? 
          `generate_series($1::date, $2::date, INTERVAL '${intervalQuantity} day')` :
          `generate_series(DATE_TRUNC('${timeUnit}', $1::date), DATE_TRUNC('${timeUnit}', $2::date), INTERVAL '${intervalQuantity} ${timeUnit}')`
        } AS interval_start
    ),
    revenue_counts AS (
      SELECT 
        DATE_TRUNC('${intervalType}', m.received_ts) AS interval_start,
        COALESCE(SUM(a.upsell_revenue_eur), 0) AS total_revenue
      FROM mail_analysis a
      JOIN mail_message m ON a.mail_uuid = m.id
      WHERE m.received_ts BETWEEN $1 AND $2
        AND a.upselling_offer = TRUE
        AND a.upsell_accepted = TRUE
        ${hotelFilter}
      GROUP BY DATE_TRUNC('${intervalType}', m.received_ts)
    )
    SELECT 
      ti.interval_start,
      COALESCE(SUM(rc.total_revenue), 0) AS total_revenue,
      '${intervalType}' AS interval_type,
      '${intervalType === 'day' ? intervalQuantity === 1 ? 'Día' : `${intervalQuantity} Días` :
        intervalType === 'week' ? intervalQuantity === 1 ? 'Semana' : `${intervalQuantity} Semanas` :
        intervalType === 'month' ? intervalQuantity === 1 ? 'Mes' : `${intervalQuantity} Meses` :
        intervalQuantity === 1 ? 'Año' : `${intervalQuantity} Años`}' AS interval_name
    FROM time_intervals ti
    LEFT JOIN revenue_counts rc ON rc.interval_start >= ti.interval_start 
      AND rc.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} ${timeUnit}'
    GROUP BY ti.interval_start
    ORDER BY ti.interval_start
  `
}

// Función para generar consulta SQL de upselling por intervalo
const generateUpsellingQuery = (intervalType: string, intervalQuantity: number, hotelFilter: string) => {
  const timeUnit = intervalType === 'day' ? 'day' : 
                   intervalType === 'week' ? 'week' : 
                   intervalType === 'month' ? 'month' : 'year'
  
  return `
    WITH time_intervals AS (
      SELECT 
        ${intervalType === 'day' ? 
          `generate_series($1::date, $2::date, INTERVAL '${intervalQuantity} day')` :
          `generate_series(DATE_TRUNC('${timeUnit}', $1::date), DATE_TRUNC('${timeUnit}', $2::date), INTERVAL '${intervalQuantity} ${timeUnit}')`
        } AS interval_start
    ),
    upselling_counts AS (
      SELECT 
        DATE_TRUNC('${intervalType}', m.received_ts) AS interval_start,
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
      GROUP BY DATE_TRUNC('${intervalType}', m.received_ts)
    ),
    email_counts AS (
      SELECT 
        DATE_TRUNC('${intervalType}', m.received_ts) AS interval_start,
        COUNT(*) AS total_emails_interval
      FROM mail_message m
      WHERE m.received_ts BETWEEN $1 AND $2
      ${hotelFilter}
      GROUP BY DATE_TRUNC('${intervalType}', m.received_ts)
    )
    SELECT 
      ti.interval_start,
      COALESCE(SUM(uc.offers_sent), 0) AS offers_sent,
      COALESCE(SUM(uc.offers_accepted), 0) AS offers_accepted,
      ROUND(
        (COALESCE(SUM(uc.offers_accepted), 0)::decimal / 
         NULLIF(COALESCE(SUM(uc.offers_sent), 0), 0)) * 100, 1
      ) AS conversion_rate,
      COALESCE(SUM(ec.total_emails_interval), 0) AS total_emails_interval,
      '${intervalType}' AS interval_type,
      '${intervalType === 'day' ? intervalQuantity === 1 ? 'Día' : `${intervalQuantity} Días` :
        intervalType === 'week' ? intervalQuantity === 1 ? 'Semana' : `${intervalQuantity} Semanas` :
        intervalType === 'month' ? intervalQuantity === 1 ? 'Mes' : `${intervalQuantity} Meses` :
        intervalQuantity === 1 ? 'Año' : `${intervalQuantity} Años`}' AS interval_name
    FROM time_intervals ti
    LEFT JOIN upselling_counts uc ON uc.interval_start >= ti.interval_start 
      AND uc.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} ${timeUnit}'
    LEFT JOIN email_counts ec ON ec.interval_start >= ti.interval_start 
      AND ec.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} ${timeUnit}'
    GROUP BY ti.interval_start
    ORDER BY ti.interval_start
  `
}

// Función para generar consulta SQL de incidencias por intervalo
const generateIncidentsQuery = (intervalType: string, intervalQuantity: number, hotelFilter: string) => {
  const timeUnit = intervalType === 'day' ? 'day' : 
                   intervalType === 'week' ? 'week' : 
                   intervalType === 'month' ? 'month' : 'year'
  
  return `
    WITH time_intervals AS (
      SELECT 
        ${intervalType === 'day' ? 
          `generate_series($1::date, $2::date, INTERVAL '${intervalQuantity} day')` :
          `generate_series(DATE_TRUNC('${timeUnit}', $1::date), DATE_TRUNC('${timeUnit}', $2::date), INTERVAL '${intervalQuantity} ${timeUnit}')`
        } AS interval_start
    ),
    incidents_counts AS (
      SELECT 
        DATE_TRUNC('${intervalType}', m.received_ts) AS interval_start,
        COUNT(*) AS total_incidents,
        ROUND(AVG(i.delay_gestion_min)) AS avg_management_delay,
        ROUND(AVG(i.delay_resolucion_min)) AS avg_resolution_delay
      FROM mail_incidencias i
      JOIN mail_message m ON i.uuid = m.id
      WHERE m.received_ts BETWEEN $1 AND $2
      ${hotelFilter}
      GROUP BY DATE_TRUNC('${intervalType}', m.received_ts)
    )
    SELECT 
      ti.interval_start,
      COALESCE(SUM(ic.total_incidents), 0) AS total_incidents,
      ROUND(AVG(ic.avg_management_delay)) AS avg_management_delay,
      ROUND(AVG(ic.avg_resolution_delay)) AS avg_resolution_delay,
      '${intervalType}' AS interval_type,
      '${intervalType === 'day' ? intervalQuantity === 1 ? 'Día' : `${intervalQuantity} Días` :
        intervalType === 'week' ? intervalQuantity === 1 ? 'Semana' : `${intervalQuantity} Semanas` :
        intervalType === 'month' ? intervalQuantity === 1 ? 'Mes' : `${intervalQuantity} Meses` :
        intervalQuantity === 1 ? 'Año' : `${intervalQuantity} Años`}' AS interval_name
    FROM time_intervals ti
    LEFT JOIN incidents_counts ic ON ic.interval_start >= ti.interval_start 
      AND ic.interval_start < ti.interval_start + INTERVAL '${intervalQuantity} ${timeUnit}'
    GROUP BY ti.interval_start
    ORDER BY ti.interval_start
  `
}

// Función para formatear fechas de intervalos
const formatIntervalDate = (row: any) => {
  const startDate = new Date(row.interval_start)
  const intervalType = row.interval_type
  const intervalName = row.interval_name
  
  let displayName: string
  let startDateFormatted: string
  let endDateFormatted: string
  
  if (intervalType === 'day') {
    const intervalMatch = intervalName.match(/(\d+)/)
    const dayQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
    const endDate = new Date(startDate.getTime() + (dayQuantity - 1) * 24 * 60 * 60 * 1000)
    
    displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
    startDateFormatted = startDate.toLocaleDateString('es-ES')
    endDateFormatted = endDate.toLocaleDateString('es-ES')
  } else if (intervalType === 'week') {
    const intervalMatch = intervalName.match(/(\d+)/)
    const weekQuantity = intervalMatch ? parseInt(intervalMatch[1]) : 1
    const endDate = new Date(startDate.getTime() + (weekQuantity * 7 - 1) * 24 * 60 * 60 * 1000)
    
    displayName = `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
    startDateFormatted = startDate.toLocaleDateString('es-ES')
    endDateFormatted = endDate.toLocaleDateString('es-ES')
  } else if (intervalType === 'month') {
    displayName = startDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
    startDateFormatted = startDate.toLocaleDateString('es-ES')
    endDateFormatted = endDate.toLocaleDateString('es-ES')
  } else if (intervalType === 'year') {
    displayName = startDate.getFullYear().toString()
    const endDate = new Date(startDate.getFullYear(), 11, 31)
    startDateFormatted = startDate.toLocaleDateString('es-ES')
    endDateFormatted = endDate.toLocaleDateString('es-ES')
  } else {
    displayName = startDate.toLocaleDateString('es-ES')
    startDateFormatted = startDate.toLocaleDateString('es-ES')
    endDateFormatted = startDate.toLocaleDateString('es-ES')
  }
  
  return { displayName, startDateFormatted, endDateFormatted }
}

export async function GET(request: NextRequest) {
  try {
    
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
    const compareFrom = searchParams.get('compareFrom') // Período de comparación
    const compareTo = searchParams.get('compareTo')   // Período de comparación
    const selectedHotels = searchParams.get('hotels')
    const interval = searchParams.get('interval') || 'auto'
    
    if (!from || !to) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    // Obtener tenant_id desde USER_CONFIGS usando el email del usuario
    let tenantId: string | undefined
    if (user.email) {
      const userConfigsStr = process.env.USER_CONFIGS
      if (!userConfigsStr) {
        console.error('❌ USER_CONFIGS environment variable is not defined')
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
      }
      const userConfigs = JSON.parse(userConfigsStr)
      tenantId = userConfigs[user.email]?.tenant_id
    }

    // Validar que tenemos tenant_id
    if (!tenantId) {
      console.error('❌ ERROR: No se pudo obtener tenant_id para el usuario:', user.email)
      return NextResponse.json({ 
        error: 'User configuration not found or missing tenant_id' 
      }, { status: 400 })
    }
    
    // Procesar hoteles seleccionados
    let hotelIds: string[] = []
    if (selectedHotels) {
      try {
        const parsedHotels = JSON.parse(selectedHotels)
        // Asegurar que sea un array
        hotelIds = Array.isArray(parsedHotels) ? parsedHotels : []
      } catch (error) {
        console.error('Error parsing selectedHotels:', error)
        hotelIds = []
      }
    }
    
    // Si no hay hoteles seleccionados, usar todos los disponibles
    if (hotelIds.length === 0) {
      // Obtener todos los hoteles del grupo desde la configuración
      try {
        const hotelGroupConfigsStr = process.env.HOTEL_GROUP_CONFIGS
        if (hotelGroupConfigsStr) {
          const hotelGroupConfigs = JSON.parse(hotelGroupConfigsStr)
          const hotelGroupConfig = hotelGroupConfigs[tenantId]
          if (hotelGroupConfig && hotelGroupConfig.id) {
            hotelIds = hotelGroupConfig.id
            console.log('🏨 Hoteles obtenidos del grupo:', hotelIds)
          }
        }
      } catch (error) {
        console.error('Error obteniendo hoteles del grupo:', error)
        hotelIds = []
      }
    }
    
    // Verificar qué hoteles tienen datos disponibles
    let hotelsWithData = [...hotelIds] // Crear una copia del array
    
    // Si no hay hoteles disponibles, usar todos los del grupo
    if (hotelsWithData.length === 0) {
      try {
        const hotelGroupConfigsStr = process.env.HOTEL_GROUP_CONFIGS
        if (hotelGroupConfigsStr) {
          const hotelGroupConfigs = JSON.parse(hotelGroupConfigsStr)
          const hotelGroupConfig = hotelGroupConfigs[tenantId]
          if (hotelGroupConfig && hotelGroupConfig.id) {
            hotelsWithData = hotelGroupConfig.id
            console.log('🏨 Hoteles del grupo obtenidos de configuración:', hotelsWithData)
          }
        }
      } catch (error) {
        console.error('Error obteniendo hoteles del grupo:', error)
      }
    }
    
    // Validación final: asegurar que hotelsWithData sea siempre un array
    if (!Array.isArray(hotelsWithData)) {
      console.warn('⚠️ hotelsWithData no es un array, convirtiendo a array vacío')
      hotelsWithData = []
    }
    
    // Crear filtro SQL para hotel_id
    const hotelFilter = hotelsWithData.length > 0 
      ? `AND m.hotel_id = ANY($${3})` 
      : ''
    
    // Función helper para usar hotelsWithData en lugar de hotelIds
    const getQueryParams = (from: string, to: string) => [from, to, hotelsWithData]

    // ===== VERIFICAR CONEXIÓN A BASE DE DATOS =====
    try {
      const debugResult = await query(tenantId, `
        SELECT COUNT(*) as total_messages FROM mail_message m
        WHERE m.received_ts BETWEEN $1 AND $2
      `, [from, to])
      
    } catch (error) {
      console.error('❌ Error conexión BD:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: error instanceof Error ? error.message : String(error),
        tenantId,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // ===== SECCIÓN 1: RESUMEN GENERAL (KPIs) =====

        // ===== FUNCIÓN AUXILIAR PARA EJECUTAR CONSULTAS =====
    const executeQueries = async (startDate: string, endDate: string) => {
      const results: any = {}
      
      // 1. TOTAL DE EMAILS Y EMAILS MANUALES
      try {
        results.emails = await query(tenantId, `
          SELECT
            COUNT(*) AS total_emails,
            COUNT(*) FILTER (WHERE manual_intervention = TRUE) AS emails_manual,
            COUNT(*) FILTER (WHERE response_ts IS NULL AND received_ts IS NOT NULL) AS emails_unanswered
          FROM mail_message m
          WHERE m.received_ts BETWEEN $1 AND $2
          ${hotelFilter}
        `, getQueryParams(startDate, endDate))
      } catch (error) {
        console.error('❌ Error emails:', error)
        results.emails = { rows: [] }
      }

      // 2. TIEMPO MEDIO DE RESPUESTA
      try {      
        results.avgResponseTime = await query(tenantId, `
          SELECT 
            AVG(m.response_ts - m.received_ts) AS avg_response_interval
          FROM mail_message m
          WHERE m.received_ts BETWEEN $1 AND $2
            AND m.response_ts IS NOT NULL 
            AND m.response_ts > m.received_ts
            ${hotelFilter}
        `, getQueryParams(startDate, endDate))
      } catch (error) {
        console.error('❌ Error tiempo respuesta:', error)
        results.avgResponseTime = { rows: [] }
      }

      // 3. SLA 10min (PORCENTAJE)
      try {      
        results.sla10min = await query(tenantId, `
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
        `, getQueryParams(startDate, endDate))
      } catch (error) {
        console.error('❌ Error SLA 10min:', error)
        results.sla10min = { rows: [] }
      }

      // 4. UPSELLING REVENUE TOTAL
      try {
        results.upsellingRevenue = await query(tenantId, `
          SELECT 
            COALESCE(SUM(upsell_revenue_eur), 0) AS total_revenue
          FROM mail_analysis a
          JOIN mail_message m ON a.mail_uuid = m.id
          WHERE m.received_ts BETWEEN $1 AND $2
            AND a.upselling_offer = TRUE
            AND a.upsell_accepted = TRUE
            ${hotelFilter}
        `, getQueryParams(startDate, endDate))
            } catch (error) {
        console.error('❌ Error upselling revenue:', error)
        results.upsellingRevenue = { rows: [] }
      }

      // 5. ESTADÍSTICAS DE INCIDENCIAS
      try {
        results.incidentsStatsResult = await query(tenantId, `
          SELECT 
            COUNT(*) AS total_incidents,
            COUNT(*) FILTER (WHERE i.resenya_clicked = TRUE) AS review_clicks,
            ROUND(AVG(i.delay_gestion_min)) AS avg_management_delay,
            ROUND(AVG(i.delay_resolucion_min)) AS avg_resolution_delay
          FROM mail_incidencias i
          JOIN mail_message m ON i.uuid = m.id
          WHERE m.received_ts BETWEEN $1 AND $2
          ${hotelFilter}
        `, getQueryParams(startDate, endDate))
      } catch (error) {
        console.error('❌ Error estadísticas incidencias:', error)
        results.incidentsStatsResult = { rows: [] }
      }
      
      // 6. ANÁLISIS DE SENTIMIENTO PARA SATISFACCIÓN
      try {
        results.sentiment = await query(tenantId, `
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
        `, getQueryParams(startDate, endDate))
        
        // Calcular satisfacción del cliente
        results.customerSatisfaction = calculateCustomerSatisfaction(results.sentiment.rows)
      } catch (error) {
        console.error('❌ Error sentimiento:', error)
        results.sentiment = { rows: [] }
        results.customerSatisfaction = 0
      }
      
      return results
    }
    
    // ===== EJECUTAR CONSULTAS PARA AMBOS PERÍODOS =====
    
    // Ejecutar consultas para el período actual
    const currentPeriodData = await executeQueries(from, to)
    
    // Ejecutar consultas para el período de comparación (si se proporciona)
    let comparisonPeriodData: any = null
    if (compareFrom && compareTo) {
      comparisonPeriodData = await executeQueries(compareFrom, compareTo)
    } else {
      // Calcular período anterior automáticamente
      const fromDate = new Date(from)
      const toDate = new Date(to)
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
      const previousFrom = new Date(fromDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000))
      const previousTo = new Date(fromDate.getTime() - (24 * 60 * 60 * 1000))
      const previousFromDate = previousFrom.toISOString().split('T')[0]
      const previousToDate = previousTo.toISOString().split('T')[0]
      
      comparisonPeriodData = await executeQueries(previousFromDate, previousToDate)
    }
    
    // ===== SECCIÓN 2: RENDIMIENTO IA =====
    
    // 5. VOLUMEN DINÁMICO E INTELIGENTE (con emails automáticos)
    let volumeResult: any = { rows: [] }
    try {
      const optimalInterval = getOptimalInterval(from, to, interval)
      
      const volumeQuery = generateVolumeQuery(
        optimalInterval.type, 
        optimalInterval.quantity, 
        hotelFilter
      )
      
      volumeResult = await query(tenantId, volumeQuery, getQueryParams(from, to))
    } catch (error) {
      console.error('❌ Error volumen dinámico:', error)
    }

    // 6. DISTRIBUCIÓN SLA COMPLETA (tramos)
    let slaTramResult: any = { rows: [] }
    try {
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
    
    // 8. ANÁLISIS DE SENTIMIENTO (ya se calcula en executeQueries)
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
      const optimalInterval = getOptimalInterval(from, to, interval)
      
      const revenueQuery = generateRevenueQuery(
        optimalInterval.type, 
        optimalInterval.quantity, 
        hotelFilter
      )
      
      upsellingRevenueByIntervalResult = await query(tenantId, revenueQuery, getQueryParams(from, to))
    } catch (error) {
      console.error('❌ Error upselling revenue por intervalo:', error)
      upsellingRevenueByIntervalResult = { rows: [] }
    }

    // 13. UPSELLING POR INTERVALO DINÁMICO (ofertas y conversión)
    let upsellingByIntervalResult: any = { rows: [] }
    try {
      const optimalInterval = getOptimalInterval(from, to, interval)
      
      const upsellingQuery = generateUpsellingQuery(
        optimalInterval.type, 
        optimalInterval.quantity, 
        hotelFilter
      )
      
      upsellingByIntervalResult = await query(tenantId, upsellingQuery, getQueryParams(from, to))
    } catch (error) {
      console.error('❌ Error upselling por intervalo:', error)
      upsellingByIntervalResult = { rows: [] }
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
      const optimalInterval = getOptimalInterval(from, to, interval)
      
      const incidentsQuery = generateIncidentsQuery(
        optimalInterval.type, 
        optimalInterval.quantity, 
        hotelFilter
      )
      
      incidentsByIntervalResult = await query(tenantId, incidentsQuery, getQueryParams(from, to))
    } catch (error) {
      console.error('❌ Error incidencias por intervalo:', error)
      incidentsByIntervalResult = { rows: [] }
    }

    // ===== TRANSFORMACIÓN DE DATOS =====
    
    // Datos para gráficas
    const volumeData = volumeResult.rows.map((row: any) => {
      const { displayName, startDateFormatted, endDateFormatted } = formatIntervalDate(row)
      
      return {
        name: displayName,
        total: parseInt(row.total_emails) || 0,
        automatic: parseInt(row.emails_automatic) || 0,
        unanswered: parseInt(row.emails_unanswered) || 0,
        intervalType: row.interval_type,
        intervalName: row.interval_name,
        startDate: startDateFormatted,
        endDate: endDateFormatted
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
      totalEmailsPeriod: parseInt(row.total), // Usar el total de emails del tramo específico
      color: getSlaTramColor(row.sla_tramo)
    }))

          // ===== OBJETO FINAL COMPLETO =====
      const data = {
        // ===== KPIs PRINCIPALES =====
        totalEmails: currentPeriodData.emails.rows.length > 0 ? parseInt(currentPeriodData.emails.rows[0]?.total_emails || 0) : null,
        totalEmailsVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.emails.rows.length > 0 ? parseInt(currentPeriodData.emails.rows[0]?.total_emails || 0) : 0,
          comparisonPeriodData.emails.rows.length > 0 ? parseInt(comparisonPeriodData.emails.rows[0]?.total_emails || 0) : 0
        ) : null,
        customerSatisfaction: currentPeriodData.customerSatisfaction || 0,
        customerSatisfactionVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.customerSatisfaction || 0,
          comparisonPeriodData.customerSatisfaction || 0
        ) : null,
        unansweredEmailsPercentage: currentPeriodData.emails.rows.length > 0 && currentPeriodData.emails.rows[0]?.total_emails > 0 
          ? Math.round(((parseInt(currentPeriodData.emails.rows[0]?.emails_unanswered || 0) / parseInt(currentPeriodData.emails.rows[0]?.total_emails || 1)) * 100) * 10) / 10
          : 0,
        unansweredEmailsPercentageVariation: comparisonPeriodData ? (() => {
          const currentPercentage = currentPeriodData.emails.rows.length > 0 && currentPeriodData.emails.rows[0]?.total_emails > 0 
            ? Math.round(((parseInt(currentPeriodData.emails.rows[0]?.emails_unanswered || 0) / parseInt(currentPeriodData.emails.rows[0]?.total_emails || 1)) * 100) * 10) / 10
            : 0
          const previousPercentage = comparisonPeriodData.emails.rows.length > 0 && comparisonPeriodData.emails.rows[0]?.total_emails > 0 
            ? Math.round(((parseInt(comparisonPeriodData.emails.rows[0]?.emails_unanswered || 0) / parseInt(comparisonPeriodData.emails.rows[0]?.total_emails || 1)) * 100) * 10) / 10
            : 0
          
          console.log('🔍 Debug % Sin Responder:', {
            current: currentPercentage,
            previous: previousPercentage,
            currentUnanswered: currentPeriodData.emails.rows[0]?.emails_unanswered,
            currentTotal: currentPeriodData.emails.rows[0]?.total_emails,
            previousUnanswered: comparisonPeriodData.emails.rows[0]?.emails_unanswered,
            previousTotal: comparisonPeriodData.emails.rows[0]?.total_emails
          })
          
          return calculateVariation(currentPercentage, previousPercentage)
        })() : null,
        emailsManual: currentPeriodData.emails.rows.length > 0 ? parseInt(currentPeriodData.emails.rows[0]?.emails_manual || 0) : null,
        emailsManualVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.emails.rows.length > 0 ? parseInt(currentPeriodData.emails.rows[0]?.emails_manual || 0) : 0,
          comparisonPeriodData.emails.rows.length > 0 ? parseInt(comparisonPeriodData.emails.rows[0]?.emails_manual || 0) : 0
        ) : null,
        avgResponseTime: currentPeriodData.avgResponseTime.rows.length > 0 ? postgresIntervalToMinutes(currentPeriodData.avgResponseTime.rows[0]?.avg_response_interval) : null,
        avgResponseTimeVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.avgResponseTime.rows.length > 0 ? postgresIntervalToMinutes(currentPeriodData.avgResponseTime.rows[0]?.avg_response_interval) || 0 : 0,
          comparisonPeriodData.avgResponseTime.rows.length > 0 ? postgresIntervalToMinutes(comparisonPeriodData.avgResponseTime.rows[0]?.avg_response_interval) || 0 : 0
        ) : null,
        sla10min: currentPeriodData.sla10min.rows.length > 0 ? parseFloat(currentPeriodData.sla10min.rows[0]?.sla_10min_pct || 0) : null,
        sla10minVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.sla10min.rows.length > 0 ? parseFloat(currentPeriodData.sla10min.rows[0]?.sla_10min_pct || 0) : 0,
          comparisonPeriodData.sla10min.rows.length > 0 ? parseFloat(comparisonPeriodData.sla10min.rows[0]?.sla_10min_pct || 0) : 0
        ) : null,
        upsellingRevenue: currentPeriodData.upsellingRevenue.rows.length > 0 ? parseFloat(currentPeriodData.upsellingRevenue.rows[0]?.total_revenue || 0) : null,
                upsellingRevenueVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.upsellingRevenue.rows.length > 0 ? parseFloat(currentPeriodData.upsellingRevenue.rows[0]?.total_revenue || 0) : 0,
          comparisonPeriodData.upsellingRevenue.rows.length > 0 ? parseFloat(comparisonPeriodData.upsellingRevenue.rows[0]?.total_revenue || 0) : 0
        ) : null,
        
        // ===== KPIs ADICIONALES =====
        interventionPercentage: currentPeriodData.emails.rows.length > 0 && currentPeriodData.emails.rows[0]?.total_emails > 0 
          ? ((parseInt(currentPeriodData.emails.rows[0]?.emails_manual || 0) / parseInt(currentPeriodData.emails.rows[0]?.total_emails || 1)) * 100) 
          : 0,
        interventionPercentageVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.emails.rows.length > 0 && currentPeriodData.emails.rows[0]?.total_emails > 0 
            ? ((parseInt(currentPeriodData.emails.rows[0]?.emails_manual || 0) / parseInt(currentPeriodData.emails.rows[0]?.total_emails || 1)) * 100) 
            : 0,
          comparisonPeriodData.emails.rows.length > 0 && comparisonPeriodData.emails.rows[0]?.total_emails > 0 
            ? ((parseInt(comparisonPeriodData.emails.rows[0]?.emails_manual || 0) / parseInt(comparisonPeriodData.emails.rows[0]?.total_emails || 1)) * 100) 
            : 0
        ) : null,
        manualIntervention: currentPeriodData.emails.rows.length > 0 && currentPeriodData.emails.rows[0]?.total_emails > 0 
          ? ((parseInt(currentPeriodData.emails.rows[0]?.emails_manual || 0) / parseInt(currentPeriodData.emails.rows[0]?.total_emails || 1)) * 100) 
          : 0,
        // Ahorro en personal (proporcional a total emails)
        personalSavings: currentPeriodData.emails.rows.length > 0 ? calculatePersonalSavings(parseInt(currentPeriodData.emails.rows[0]?.total_emails || 0)) : 0,
        personalSavingsVariation: comparisonPeriodData ? calculateVariation(
          currentPeriodData.emails.rows.length > 0 ? calculatePersonalSavings(parseInt(currentPeriodData.emails.rows[0]?.total_emails || 0)) : 0,
          comparisonPeriodData.emails.rows.length > 0 ? calculatePersonalSavings(parseInt(comparisonPeriodData.emails.rows[0]?.total_emails || 0)) : 0
        ) : null,
        
        // ===== DATOS PARA GRÁFICAS =====
      volume: volumeData,
      slaTram: slaTramData,
      sentiment: sentimentData,
      language: languageData,
      category: categoryData,
      

      
      // Revenue de upselling por mes
      upsellingRevenueByMonth: upsellingRevenueByIntervalResult.rows.map((row: any) => {
        const { displayName } = formatIntervalDate(row)
        
        return {
          name: displayName,
          value: parseFloat(row.total_revenue) || 0,
          intervalType: row.interval_type,
          intervalName: row.interval_name
        }
      }),

      // Upselling por intervalo dinámico (ofertas enviadas y conversión)
      upsellingByMonth: upsellingByIntervalResult.rows.map((row: any) => {
        const { displayName } = formatIntervalDate(row)
        
        return {
          name: displayName,
          offersSent: parseInt(row.offers_sent) || 0,
          conversionRate: parseFloat(row.conversion_rate) || 0,
          totalEmailsInterval: parseInt(row.total_emails_interval) || 0,
          intervalType: row.interval_type,
          intervalName: row.interval_name
        }
      }),
      
      // ===== INCIDENCIAS =====
      incidencias: {
        total: incidentsStatsResult.rows.length > 0 ? parseInt(incidentsStatsResult.rows[0]?.total_incidents || 0) : 0,
        totalVariation: comparisonPeriodData ? calculateVariation(
          incidentsStatsResult.rows.length > 0 ? parseInt(incidentsStatsResult.rows[0]?.total_incidents || 0) : 0,
          comparisonPeriodData.incidentsStatsResult?.rows.length > 0 ? parseInt(comparisonPeriodData.incidentsStatsResult.rows[0]?.total_incidents || 0) : 0
        ) : null,
        reviewClicks: incidentsStatsResult.rows.length > 0 ? parseInt(incidentsStatsResult.rows[0]?.review_clicks || 0) : 0,
        reviewClicksVariation: comparisonPeriodData ? calculateVariation(
          incidentsStatsResult.rows.length > 0 ? parseInt(incidentsStatsResult.rows[0]?.review_clicks || 0) : 0,
          comparisonPeriodData.incidentsStatsResult?.rows.length > 0 ? parseInt(comparisonPeriodData.incidentsStatsResult.rows[0]?.review_clicks || 0) : 0
        ) : null,
        avgManagementDelay: incidentsStatsResult.rows.length > 0 ? Math.round(parseFloat(incidentsStatsResult.rows[0]?.avg_management_delay || 0)) : 0,
        avgManagementDelayVariation: comparisonPeriodData ? calculateVariation(
          incidentsStatsResult.rows.length > 0 ? Math.round(parseFloat(incidentsStatsResult.rows[0]?.avg_management_delay || 0)) : 0,
          comparisonPeriodData.incidentsStatsResult?.rows.length > 0 ? Math.round(parseFloat(comparisonPeriodData.incidentsStatsResult.rows[0]?.avg_management_delay || 0)) : 0
        ) : null,
        avgResolutionDelay: incidentsStatsResult.rows.length > 0 ? Math.round(parseFloat(incidentsStatsResult.rows[0]?.avg_resolution_delay || 0)) : 0,
        avgResolutionDelayVariation: comparisonPeriodData ? calculateVariation(
          incidentsStatsResult.rows.length > 0 ? Math.round(parseFloat(incidentsStatsResult.rows[0]?.avg_resolution_delay || 0)) : 0,
          comparisonPeriodData.incidentsStatsResult?.rows.length > 0 ? Math.round(parseFloat(comparisonPeriodData.incidentsStatsResult.rows[0]?.avg_resolution_delay || 0)) : 0
        ) : null,
        incidenciasPorSubcategoria: incidenciasPorSubcategoriaResult.rows.map((row: any) => ({
          name: row.category,
          value: parseInt(row.total)
        })),
        porMes: incidentsByIntervalResult.rows.map((row: any) => {
          const { displayName } = formatIntervalDate(row)
          
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
    console.log('  • Hoteles filtro:', hotelsWithData)
    console.log('  • Tenant ID:', tenantId)
    
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
    console.log(`  🚨 Incidencias: ${data.incidencias.total} total, ${data.incidencias.reviewClicks} reviews`)
    console.log(`  🔍 Variaciones Incidencias:`)
    console.log(`    - Total: ${data.incidencias.totalVariation ? `${data.incidencias.totalVariation.percentage}% ${data.incidencias.totalVariation.isIncrease ? '↗️' : '↘️'}` : 'N/A'}`)
    console.log(`    - Review Clicks: ${data.incidencias.reviewClicksVariation ? `${data.incidencias.reviewClicksVariation.percentage}% ${data.incidencias.reviewClicksVariation.isIncrease ? '↗️' : '↘️'}` : 'N/A'}`)
    console.log(`    - Tiempo Gestión: ${data.incidencias.avgManagementDelayVariation ? `${data.incidencias.avgManagementDelayVariation.percentage}% ${data.incidencias.avgManagementDelayVariation.isIncrease ? '↗️' : '↘️'}` : 'N/A'}`)
    console.log(`    - Tiempo Resolución: ${data.incidencias.avgResolutionDelayVariation ? `${data.incidencias.avgResolutionDelayVariation.percentage}% ${data.incidencias.avgResolutionDelayVariation.isIncrease ? '↗️' : '↘️'}` : 'N/A'}`)
    console.log(`  📊 Volumen: ${volumeResult.rows.length} ${volumeResult.rows[0]?.interval_name?.toLowerCase() || 'períodos'} (intervalo: ${volumeResult.rows[0]?.interval_type || 'N/A'})`)
    console.log(`  ⏰ SLA tramos: ${slaTramResult.rows.map((r: any) => `${r.sla_tramo}:${r.total}`).join(', ')}`)
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




