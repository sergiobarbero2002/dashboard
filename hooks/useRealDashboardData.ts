import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { generateIntelligentDates, formatChartDate, getDefaultDateRange } from '@/lib/date-utils'
import { getSlaTramColor } from '@/lib/chart-colors'
import { useToast } from '@/hooks/useToast'
import { useSound } from '@/hooks/useSound'

export interface DashboardData {
  // Información del período de comparación
  comparisonPeriodText: string
  
  // KPIs principales
  totalEmails: number
  totalEmailsVariation?: { percentage: number; isIncrease: boolean }
  emailsManual: number
  emailsManualVariation?: { percentage: number; isIncrease: boolean }
  avgResponseTime: number | null
  avgResponseTimeVariation?: { percentage: number; isIncrease: boolean }
  mttrPromedio: number
  mttrPromedioVariation?: { percentage: number; isIncrease: boolean }
  sla10min: number | null
  sla10minVariation?: { percentage: number; isIncrease: boolean }
  upsellingRevenue: number
  upsellingRevenueVariation?: { percentage: number; isIncrease: boolean }
  ahorroEuros: number
  ahorroEurosVariation?: { percentage: number; isIncrease: boolean }
  
  // KPIs adicionales con variaciones
  interventionPercentage: number
  interventionPercentageVariation?: { percentage: number; isIncrease: boolean }
  personalSavings: number
  personalSavingsVariation?: { percentage: number; isIncrease: boolean }
  
  // Datos para gráficas
  volume: Array<{ name: string; total: number; automatic: number; unanswered?: number; intervalType?: string; intervalName?: string; startDate?: string; endDate?: string }>
  mttr: Array<{ name: string; average: number }>
  manual: Array<{ name: string; value: number }>
  slaTram: Array<{ name: string; value: number; color: string }>
  sentiment: Array<{ name: string; value: number; color: string }>
  language: Array<{ name: string; value: number; color: string }>
  category: Array<{ name: string; value: number; color: string }>
  
  // Upselling
  upselling: {
    offersSent: number
    offersAccepted: number
    conversionRate: number
  }
  
  // Revenue por mes para gráfico de barras
          upsellingRevenueByMonth: Array<{ name: string; value: number; intervalType?: string; intervalName?: string }>
  
  // Upselling por mes (ofertas enviadas y conversión)
          upsellingByMonth: Array<{ name: string; offersSent: number; conversionRate: number; intervalType?: string; intervalName?: string }>
  
  // Incidencias
  incidencias: {
    total: number
    totalVariation?: { percentage: number; isIncrease: boolean }
    reviewClicks: number
    reviewClicksVariation?: { percentage: number; isIncrease: boolean }
    avgManagementDelay: number
    avgManagementDelayVariation?: { percentage: number; isIncrease: boolean }
    avgResolutionDelay: number
    avgResolutionDelayVariation?: { percentage: number; isIncrease: boolean }
    incidenciasPorSubcategoria: Array<{ name: string; value: number }>
            porMes: Array<{ name: string; totalIncidents: number; avgManagementDelay: number; avgResolutionDelay: number; intervalType?: string; intervalName?: string }>
  }
}

export interface DateRange {
  from: Date
  to: Date
}

export const useRealDashboardData = (savingsParams?: { minutesPerEmail: number; hourlyRate: number }) => {
  const { session, selectedHotels } = useSupabase()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [previousRawData, setPreviousRawData] = useState<any>(null)
  const { showSuccess } = useToast()
  const { playSuccess } = useSound()

  const fetchData = useCallback(async (range: DateRange) => {
    if (!session?.access_token) {
      console.error('❌ No hay token de sesión disponible')
      setError('No hay sesión activa')
      return
    }

    console.log('📅 Rango:', range.from.toLocaleDateString(), 'a', range.to.toLocaleDateString())
    
    setLoading(true)
    setError(null)
    
    try {
      const fromDate = range.from.toISOString().split('T')[0]
      const toDate = range.to.toISOString().split('T')[0]
      
      // Calcular el período anterior para comparación
      const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
      const previousFrom = new Date(range.from.getTime() - (daysDiff * 24 * 60 * 60 * 1000))
      const previousTo = new Date(range.from.getTime() - (24 * 60 * 60 * 1000))
      
      const previousFromDate = previousFrom.toISOString().split('T')[0]
      const previousToDate = previousTo.toISOString().split('T')[0]
      
      console.log('📅 Período anterior:', previousFromDate, 'a', previousToDate, '(diferencia:', daysDiff, 'días)')
      
      // Obtener datos del período actual
      const response = await fetch(`/api/ops?from=${fromDate}&to=${toDate}&hotels=${JSON.stringify(selectedHotels)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      // Obtener datos del período anterior para comparación
      const previousResponse = await fetch(`/api/ops?from=${previousFromDate}&to=${previousToDate}&hotels=${JSON.stringify(selectedHotels)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })



      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en API:', response.status, errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      if (!previousResponse.ok) {
        console.warn('⚠️ No se pudieron obtener datos del período anterior para comparación')
      }

      const apiData = await response.json()
      const previousApiData = previousResponse.ok ? await previousResponse.json() : null
      
      console.log('✅ Datos recibidos de la API:', apiData)
      console.log('🔍 apiData.volume:', apiData.volume)
      console.log('🔍 apiData.volume primer item:', apiData.volume?.[0])
      console.log('🔍 apiData.volume keys del primer item:', apiData.volume?.[0] ? Object.keys(apiData.volume[0]) : 'no hay items')
      console.log('🔍 apiData.slaTram:', apiData.slaTram)
      console.log('🔍 apiData.slaTram primer item:', apiData.slaTram?.[0])
      console.log('🔍 apiData.slaTram keys del primer item:', apiData.slaTram?.[0] ? Object.keys(apiData.slaTram[0]) : 'no hay items')
      
      // Procesar y distribuir los datos inteligentemente
      const processedData = processChartData(apiData, previousApiData, range, savingsParams)
      
      setData(processedData)
      setPreviousRawData(previousApiData) // Guardar datos del período anterior
      setLastUpdated(new Date())
      setError(null)
      
    } catch (error: any) {
      console.error('❌ Error en fetchData REAL:', error)
      setError(error.message || 'Error al obtener datos')
      setData(null)
    } finally {
      setLoading(false)
      console.log('🏁 fetchData REAL completado, loading:', false)
    }
  }, [session?.access_token, selectedHotels]) // Depender del token y hoteles seleccionados

  // Función para calcular variación porcentual entre dos valores
  const calculateVariation = (current: number, previous: number): { percentage: number; isIncrease: boolean } => {
    if (previous === 0) return { percentage: current > 0 ? 100 : 0, isIncrease: current > 0 }
    const variation = ((current - previous) / previous) * 100
    return { percentage: Math.abs(variation), isIncrease: variation > 0 }
  }

  // Función para generar el texto del período de comparación
  const getComparisonPeriodText = (days: number) => {
    if (days === 1) return 'ayer'
    if (days === 7) return 'la semana anterior'
    if (days === 30) return 'el mes anterior'
    if (days === 90) return 'el trimestre anterior'
    if (days === 365) return 'el año anterior'
    return `los ${days} días anteriores`
  }

  // Función para procesar y distribuir los datos de manera inteligente
  const processChartData = (rawData: any, previousRawData: any, range: DateRange, savingsParams?: { minutesPerEmail: number; hourlyRate: number }): DashboardData => {
    // Verificar que rawData tenga la estructura esperada
    if (!rawData || typeof rawData !== 'object') {
      console.error('❌ rawData no es un objeto válido:', rawData)
      return createEmptyData()
    }
    
    // Calcular días de diferencia para el texto
    const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
    const comparisonPeriodText = getComparisonPeriodText(daysDiff)
    
    // Generar fechas inteligentes para las gráficas
    const intelligentDates = generateIntelligentDates(range, 7)
    
    // Procesar volumen de emails - Usar directamente los datos de la API
    console.log('🔍 Procesando volumen en hook:')
    console.log('  - rawData.volume:', rawData.volume)
    console.log('  - rawData.volume length:', rawData.volume?.length)
    
    // Usar directamente los datos de volumen de la API en lugar de procesarlos
    const volumeData = rawData.volume || []
    
    console.log('🔍 VolumeData procesado en hook:')
    console.log('  - volumeData length:', volumeData.length)
    console.log('  - Primer item:', volumeData[0])
    console.log('  - Último item:', volumeData[volumeData.length - 1])

    // Procesar MTTR
    const mttrData = intelligentDates.map(date => {
      const dateStr = date.toISOString().split('T')[0]
      // Usar el mismo formato que la API: día/mes
      const formattedDate = date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'numeric' 
      })
      
      // Buscar por el nombre formateado
      const matchingData = rawData.mttr?.find((item: any) => item.name === formattedDate)
      
      const result = {
        name: formattedDate,
        average: matchingData?.average || 0
      }
      return result
    })

    // Procesar intervención manual
    const manualData = intelligentDates.map(date => {
      const dateStr = date.toISOString().split('T')[0]
      // Usar el mismo formato que la API: día/mes
      const formattedDate = date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'numeric' 
      })
      
      // Buscar por el nombre formateado
      const matchingData = rawData.manual?.find((item: any) => item.name === formattedDate)
      
      const result = {
        name: formattedDate,
        value: matchingData?.value || 0
      }
      return result
    })

    // SLA por tramos (convertir a porcentajes)
    
    // Calcular el total de emails para calcular porcentajes
    const totalSlaEmails = rawData.slaTram?.reduce((sum: number, item: any) => sum + (item.value || 0), 0) || 0
    
    const slaTramData = rawData.slaTram?.map((item: any) => {
      const percentage = totalSlaEmails > 0 ? ((item.value || 0) / totalSlaEmails) * 100 : 0
      return {
        name: item.name,
        value: Number(percentage.toFixed(1)),
        color: getSlaTramColor(item.name)
      }
    }) || [
      { name: '<10min', value: 0, color: getSlaTramColor('<10min') },
      { name: '10min-1h', value: 0, color: getSlaTramColor('10min-1h') },
      { name: '1-4h', value: 0, color: getSlaTramColor('1-4h') },
      { name: '4-24h', value: 0, color: getSlaTramColor('4-24h') },
      { name: '>24h', value: 0, color: getSlaTramColor('>24h') }
    ]

    const result: DashboardData = {
      // Información del período de comparación
      comparisonPeriodText: comparisonPeriodText,
      
      // KPIs principales
      totalEmails: rawData.totalEmails || 0,
      totalEmailsVariation: previousRawData ? calculateVariation(
        rawData.totalEmails || 0, 
        previousRawData.totalEmails || 0
      ) : undefined,
      
      emailsManual: rawData.emailsManual || 0,
      emailsManualVariation: previousRawData ? calculateVariation(
        rawData.emailsManual || 0, 
        previousRawData.emailsManual || 0
      ) : undefined,
      
      mttrPromedio: rawData.mttrPromedio || 0,
      mttrPromedioVariation: previousRawData ? calculateVariation(
        rawData.mttrPromedio || 0, 
        previousRawData.mttrPromedio || 0
      ) : undefined,
      
      sla10min: rawData.sla10min || null,
      sla10minVariation: previousRawData ? calculateVariation(
        rawData.sla10min || 0, 
        previousRawData.sla10min || 0
      ) : undefined,
      
      avgResponseTime: rawData.avgResponseTime || null,
      avgResponseTimeVariation: previousRawData ? calculateVariation(
        rawData.avgResponseTime || 0, 
        previousRawData.avgResponseTime || 0
      ) : undefined,
      
      upsellingRevenue: rawData.upsellingRevenue || 0,
      upsellingRevenueVariation: previousRawData ? calculateVariation(
        rawData.upsellingRevenue || 0, 
        previousRawData.upsellingRevenue || 0
      ) : undefined,
      
      ahorroEuros: rawData.ahorroEuros || 0,
      ahorroEurosVariation: previousRawData ? calculateVariation(
        rawData.ahorroEuros || 0, 
        previousRawData.ahorroEuros || 0
      ) : undefined,
      
      // KPIs adicionales con variaciones
      interventionPercentage: rawData.totalEmails > 0 ? ((rawData.emailsManual || 0) / rawData.totalEmails) * 100 : 0,
      interventionPercentageVariation: previousRawData ? calculateVariation(
        rawData.totalEmails > 0 ? ((rawData.emailsManual || 0) / rawData.totalEmails) * 100 : 0,
        previousRawData.totalEmails > 0 ? ((previousRawData.emailsManual || 0) / previousRawData.totalEmails) * 100 : 0
      ) : undefined,
      
      personalSavings: rawData.ahorroEuros || 0, // Usar el mismo valor que ahorroEuros
      personalSavingsVariation: previousRawData ? calculateVariation(
        rawData.totalEmails || 0, 
        previousRawData.totalEmails || 0
      ) : undefined, // La variación del ahorro personal es igual a la del total de emails
      
      // Datos para gráficas
      volume: volumeData,
      mttr: mttrData,
      manual: manualData,
      slaTram: slaTramData,
      sentiment: rawData.sentiment || [],
      language: rawData.language || [],
      category: rawData.category || [],
      
      // Upselling
      upselling: rawData.upselling || {
        offersSent: 0,
        offersAccepted: 0,
        conversionRate: 0
      },
      
      // Revenue por mes para gráfico de barras
      upsellingRevenueByMonth: rawData.upsellingRevenueByMonth || [],
      
      // Upselling por mes (ofertas enviadas y conversión)
      upsellingByMonth: rawData.upsellingByMonth || [],
      
      // Incidencias
      incidencias: {
        total: rawData.incidencias?.total || 0,
        totalVariation: previousRawData ? calculateVariation(
          rawData.incidencias?.total || 0, 
          previousRawData.incidencias?.total || 0
        ) : undefined,
        
        reviewClicks: rawData.incidencias?.reviewClicks || 0,
        reviewClicksVariation: previousRawData ? calculateVariation(
          rawData.incidencias?.reviewClicks || 0, 
          previousRawData.incidencias?.reviewClicks || 0
        ) : undefined,
        
        avgManagementDelay: rawData.incidencias?.avgManagementDelay || 0,
        avgManagementDelayVariation: previousRawData ? calculateVariation(
          rawData.incidencias?.avgManagementDelay || 0, 
          previousRawData.incidencias?.avgManagementDelay || 0
        ) : undefined,
        
        avgResolutionDelay: rawData.incidencias?.avgResolutionDelay || 0,
        avgResolutionDelayVariation: previousRawData ? calculateVariation(
          rawData.incidencias?.avgResolutionDelay || 0, 
          previousRawData.incidencias?.avgResolutionDelay || 0
        ) : undefined,
        
        incidenciasPorSubcategoria: rawData.incidencias?.incidenciasPorSubcategoria || [],
        porMes: rawData.incidencias?.porMes || []
      }
    }
    
    // ===== LOG DETALLADO DEL PERÍODO ACTUAL =====
    console.log('')
    console.log('📋 DETALLES DEL PERÍODO ACTUAL:')
    console.log(`  📊 Volumen: ${rawData.volume?.length || 0} meses`)
    console.log(`  ⏰ SLA tramos: ${rawData.slaTram?.map((r: any) => `${r.name}:${r.value}`).join(', ') || 'Sin datos'}`)
    console.log(`  👤 Manual: ${rawData.manual?.length || 0} meses`)
    console.log(`  😊 Sentimiento: ${rawData.sentiment?.map((r: any) => `${r.name}:${r.value}`).join(', ') || 'Sin datos'}`)
    console.log(`  🌍 Idiomas: ${rawData.language?.map((r: any) => `${r.name}:${r.value}`).join(', ') || 'Sin datos'}`)
    console.log(`  📂 Categorías: ${rawData.category?.map((r: any) => `${r.name}:${r.value}`).join(', ') || 'Sin datos'}`)
    console.log(`  📈 Ups. revenue por mes: ${rawData.upsellingRevenueByMonth?.length || 0} meses`)
    console.log(`  📊 Ups. por mes: ${rawData.upsellingByMonth?.length || 0} meses`)
            console.log(`  📋 Inc. por subcategoría: ${rawData.incidencias?.incidenciasPorSubcategoria?.map((r: any) => `${r.name}:${r.value}`).join(', ') || 'Sin datos'}`)
    console.log(`  📅 Inc. por mes: ${rawData.incidencias?.porMes?.length || 0} meses`)
    console.log('')
    
    // ===== LOGS DE COMPARACIÓN =====
    if (previousRawData) {
      console.log('')
      console.log('📊 DATOS DEL PERÍODO DE COMPARACIÓN:')
      console.log(`  📧 Emails: ${previousRawData.totalEmails || 0} total, ${previousRawData.emailsManual || 0} manuales`)
      console.log(`  ⏱️ Tiempo respuesta: ${previousRawData.avgResponseTime || 0} min`)
      console.log(`  🎯 SLA 10min: ${previousRawData.sla10min || 0}%`)
      console.log(`  💰 Upselling: ${previousRawData.upselling?.offersSent || 0} enviadas, ${previousRawData.upselling?.offersAccepted || 0} aceptadas`)
      console.log(`  🚨 Incidencias: ${previousRawData.incidencias?.total || 0} total, ${previousRawData.incidencias?.reviewClicks || 0} reviews`)
      console.log('')
      
      console.log('📈 VARIACIONES PORCENTUALES:')
      const totalEmailsVar = previousRawData.totalEmails ? ((rawData.totalEmails - previousRawData.totalEmails) / previousRawData.totalEmails * 100).toFixed(1) : 'N/A'
      const emailsManualVar = previousRawData.emailsManual ? ((rawData.emailsManual - previousRawData.emailsManual) / previousRawData.emailsManual * 100).toFixed(1) : 'N/A'
      const avgResponseTimeVar = previousRawData.avgResponseTime ? ((rawData.avgResponseTime - previousRawData.avgResponseTime) / previousRawData.avgResponseTime * 100).toFixed(1) : 'N/A'
      const sla10minVar = previousRawData.sla10min ? ((rawData.sla10min - previousRawData.sla10min) / previousRawData.sla10min * 100).toFixed(1) : 'N/A'
      const upsellingVar = previousRawData.upselling?.offersSent ? ((rawData.upselling.offersSent - previousRawData.upselling.offersSent) / previousRawData.upselling.offersSent * 100).toFixed(1) : 'N/A'
      const incidenciasVar = previousRawData.incidencias?.total ? ((rawData.incidencias.total - previousRawData.incidencias.total) / previousRawData.incidencias.total * 100).toFixed(1) : 'N/A'
      
      console.log(`  📧 Emails totales: ${totalEmailsVar}%`)
      console.log(`  📧 Emails manuales: ${emailsManualVar}%`)
      console.log(`  ⏱️ Tiempo respuesta: ${avgResponseTimeVar}%`)
      console.log(`  🎯 SLA 10min: ${sla10minVar}%`)
      console.log(`  💰 Upselling: ${upsellingVar}%`)
      console.log(`  🚨 Incidencias: ${incidenciasVar}%`)
      console.log('')
      console.log('='.repeat(60))
    }
    
    return result
  }

  // Función para crear datos vacíos cuando hay errores
  const createEmptyData = (): DashboardData => {
    const emptyDates = generateIntelligentDates(dateRange, 7)
    return {
      // Información del período de comparación
      comparisonPeriodText: 'Sin datos',
      
      // KPIs principales
      totalEmails: 0,
      emailsManual: 0,
      mttrPromedio: 0,
      sla10min: 0,
      avgResponseTime: 0,
      upsellingRevenue: 0,
      ahorroEuros: 0,
      
      // KPIs adicionales con variaciones
      interventionPercentage: 0,
      personalSavings: 0,
      
      // Datos para gráficas
      volume: emptyDates.map(date => ({ name: formatChartDate(date, dateRange), total: 0, automatic: 0 })),
      mttr: emptyDates.map(date => ({ name: formatChartDate(date, dateRange), average: 0 })),
      manual: emptyDates.map(date => ({ name: formatChartDate(date, dateRange), value: 0 })),
      slaTram: [
        { name: '<10min', value: 0, color: getSlaTramColor('<10min') },
        { name: '10min-1h', value: 0, color: getSlaTramColor('10min-1h') },
        { name: '1-4h', value: 0, color: getSlaTramColor('1-4h') },
        { name: '4-24h', value: 0, color: getSlaTramColor('4-24h') },
        { name: '>24h', value: 0, color: getSlaTramColor('>24h') }
      ],
      sentiment: [],
      language: [],
      category: [],
      
      // Upselling
      upselling: {
        offersSent: 0,
        offersAccepted: 0,
        conversionRate: 0
      },
      
      // Revenue por mes para gráfico de barras
      upsellingRevenueByMonth: [],
      
      // Upselling por mes (ofertas enviadas y conversión)
      upsellingByMonth: [],
      
      // Incidencias
      incidencias: {
        total: 0,
        reviewClicks: 0,
        avgManagementDelay: 0,
        avgResolutionDelay: 0,
        incidenciasPorSubcategoria: [],
        porMes: []
      }
    }
  }

  const refreshData = useCallback(async () => {
    try {
      await fetchData(dateRange)
      // Mostrar notificación de éxito
      showSuccess('Datos actualizados correctamente')
      // Reproducir sonido de éxito
      playSuccess()
    } catch (error) {
      console.error('❌ Error al actualizar datos:', error)
    }
  }, [fetchData, dateRange, showSuccess, playSuccess])



  const updateDateRange = useCallback(async (from: Date, to: Date) => {
    const newRange = { from, to }
    
    // Actualizar el estado local primero
    setDateRange(newRange)
    
    // Luego cargar los datos con el nuevo rango
    await fetchData(newRange)
  }, [fetchData])

  // Cargar datos iniciales cuando haya sesión
  useEffect(() => {
    if (session?.access_token) {
      fetchData(dateRange)
    }
  }, [session?.access_token]) // Solo depender del token de sesión

  // Cargar datos cuando cambien los hoteles seleccionados
  useEffect(() => {
    if (session?.access_token && selectedHotels.length > 0) {
      fetchData(dateRange)
    }
  }, [selectedHotels, session?.access_token]) // Depender de hoteles seleccionados





  // Asegurar que siempre devolvemos valores válidos
  const safeDateRange = dateRange || getDefaultDateRange()
  const safeLastUpdated = lastUpdated || new Date()

  return {
    data,
    loading,
    error,
    dateRange: safeDateRange,
    lastUpdated: safeLastUpdated,
    refreshData,
    updateDateRange
  }
}
