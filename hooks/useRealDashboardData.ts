import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { generateIntelligentDates, formatChartDate } from '@/lib/date-utils'
import { getSlaTramColor } from '@/lib/chart-colors'
import { useToast } from '@/hooks/useToast'
import { useSound } from '@/hooks/useSound'

export interface DashboardData {
  // Información del período de comparación
  comparisonPeriodText: string
  
  // KPIs principales
  totalEmails: number
  totalEmailsVariation?: { percentage: number; isIncrease: boolean }
  customerSatisfaction: number
  customerSatisfactionVariation?: { percentage: number; isIncrease: boolean }
  unansweredEmailsPercentage: number
  unansweredEmailsPercentageVariation?: { percentage: number; isIncrease: boolean }
  avgResponseTime: number | null
  avgResponseTimeVariation?: { percentage: number; isIncrease: boolean }
  sla10min: number | null
  sla10minVariation?: { percentage: number; isIncrease: boolean }
  upsellingRevenue: number
  upsellingRevenueVariation?: { percentage: number; isIncrease: boolean }
  
  // KPIs adicionales con variaciones
  interventionPercentage: number
  interventionPercentageVariation?: { percentage: number; isIncrease: boolean }
  personalSavings: number
  personalSavingsVariation?: { percentage: number; isIncrease: boolean }
  

  
  // Datos para gráficas
  volume: Array<{ name: string; total: number; automatic: number; unanswered?: number; intervalType?: string; intervalName?: string; startDate?: string; endDate?: string }>
  slaTram: Array<{ name: string; value: number; totalEmailsPeriod: number; color: string }>
  sentiment: Array<{ name: string; value: number; color: string }>
  language: Array<{ name: string; value: number; color: string }>
  category: Array<{ name: string; value: number; color: string }>
  
  // Revenue por mes para gráfico de barras
  upsellingRevenueByMonth: Array<{ name: string; value: number; intervalType?: string; intervalName?: string }>
  
  // Upselling por mes (ofertas enviadas y conversión)
  upsellingByMonth: Array<{ name: string; offersSent: number; conversionRate: number; totalEmailsInterval: number; intervalType?: string; intervalName?: string }>
  
  // Variaciones para KPIs de upselling
  upsellingVariations?: {
    totalOffersSent?: { percentage: number; isIncrease: boolean }
    totalOffersConverted?: { percentage: number; isIncrease: boolean }
    avgConversionRate?: { percentage: number; isIncrease: boolean }
    avgOfferRate?: { percentage: number; isIncrease: boolean }
  }
  
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

/**
 * Hook para obtener datos del dashboard
 * 
 * 🎯 REGLAS DE EJECUCIÓN:
 * 1. SOLO se ejecuta fetchData cuando:
 *    - ✅ Usuario se autentica (login/demo) - UNA SOLA VEZ
 *    - ✅ Usuario presiona botón "Actualizar" - MANUAL
 * 2. NUNCA se ejecuta automáticamente por:
 *    - ❌ Cambios en hoteles seleccionados
 *    - ❌ Cambios en rango de fechas
 *    - ❌ Cambios en intervalo
 *    - ❌ Re-renders del componente
 * 
 * 📋 FUNCIONES DISPONIBLES:
 * - updateDateRange(): Solo actualiza estado local (NO API)
 * - updateInterval(): Solo actualiza estado local (NO API)
 * - updateSelectedHotels(): Solo actualiza estado local (NO API)
 * - refreshData(): Ejecuta fetchData con parámetros actuales
 * 
 * 💡 FLUJO CORRECTO:
 * 1. Usuario cambia fechas/intervalo/hoteles → Solo estado local
 * 2. Usuario presiona "Actualizar" → fetchData con parámetros actuales
 */
export const useRealDashboardData = (savingsParams?: { minutesPerEmail: number; hourlyRate: number }) => {
  const { session, selectedHotels } = useSupabase()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    const from = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)) // 30 días atrás
    return { from, to: now }
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [currentInterval, setCurrentInterval] = useState<string>('auto')
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)
  const [shouldStopTrying, setShouldStopTrying] = useState(false)
  const [isFetching, setIsFetching] = useState(false) // NUEVO: Control de ejecución única
  const { showSuccess } = useToast()
  const { playClick, playSuccess } = useSound()

  // SOLO UNA VEZ: Cargar datos cuando se autentica el usuario (después del login/demo)
  useEffect(() => {
    if (session?.access_token && selectedHotels.length > 0 && !hasAttemptedLoad) {
      console.log('🚀 === PRIMERA CARGA: USUARIO AUTENTICADO ===')
      console.log('📍 === LLAMANDO A fetchData DESDE useEffect ===')
      setHasAttemptedLoad(true)
      fetchData(dateRange, currentInterval)
    } else {
      console.log('❌ === NO SE EJECUTA PRIMERA CARGA ===')
      if (!session?.access_token) console.log('  - Razón: No hay token de sesión')
      if (selectedHotels.length === 0) console.log('  - Razón: No hay hoteles seleccionados')
      if (hasAttemptedLoad) console.log('  - Razón: Ya se intentó cargar')
    }
  }, [session?.access_token, selectedHotels, hasAttemptedLoad])

  const fetchData = useCallback(async (range: DateRange, interval: string = 'auto') => {
    console.log('🔄 === fetchData EJECUTADO ===')
    console.log('📋 Parámetros:', { range, interval })
    console.log('🔍 === STACK TRACE ===')
    console.trace('fetchData llamado desde:')
    console.log('🔍 === FIN STACK TRACE ===')
    
    if (!session?.access_token) {
      console.error('❌ No hay token de sesión disponible')
      setError('No hay sesión activa')
      return
    }

    // CONTROL DE EJECUCIÓN ÚNICA: Si ya se está ejecutando, parar
    if (isFetching) {
      console.log('⏹️ === DETENIENDO: fetchData ya se está ejecutando ===')
      return
    }

    console.log('✅ === fetchData INICIANDO EJECUCIÓN ===')
    console.log('🔒 Estado isFetching:', isFetching)
    console.log('🔒 Estado hasAttemptedLoad:', hasAttemptedLoad)
    console.log('🔒 Estado shouldStopTrying:', shouldStopTrying)

    // Si ya se intentó y no hay datos, parar
    if (hasAttemptedLoad && shouldStopTrying) {
      console.log('⏹️ === DETENIENDO: Ya se intentó y se marcó para parar ===')
      return
    }

    console.log('✅ Token de sesión disponible:', session.access_token.substring(0, 20) + '...')
    
    // MARCAR QUE SE ESTÁ EJECUTANDO
    setIsFetching(true)
    setLoading(true)
    setError(null)
    
    try {
      const fromDate = range.from.toISOString().split('T')[0]
      const toDate = range.to.toISOString().split('T')[0]
      
      console.log('📅 Fechas formateadas:', { fromDate, toDate })
      
      // Calcular el período anterior para comparación
      const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
      const previousFrom = new Date(range.from.getTime() - (daysDiff * 24 * 60 * 60 * 1000))
      const previousTo = new Date(range.from.getTime() - (24 * 60 * 60 * 1000))
      
      const previousFromDate = previousFrom.toISOString().split('T')[0]
      const previousToDate = previousTo.toISOString().split('T')[0]
      
      console.log('📅 Período anterior:', previousFromDate, 'a', previousToDate, '(diferencia:', daysDiff, 'días)')
      




      // Construir URL con parámetros de intervalo y comparación
      const intervalParam = interval !== 'auto' ? `&interval=${interval}` : ''
      const compareParam = `&compareFrom=${previousFromDate}&compareTo=${previousToDate}`
      const apiUrl = `/api/ops?from=${fromDate}&to=${toDate}&hotels=${JSON.stringify(selectedHotels)}${intervalParam}${compareParam}`
      
      console.log('📡 Llamando a API con URL:', apiUrl)
      
      // Obtener datos del período actual CON variaciones calculadas por la API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 Respuesta de la API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status} ${response.statusText}`)
      }

      const rawData = await response.json()

      // Verificar si hay datos reales
      if (!rawData.totalEmails || rawData.totalEmails === 0) {
        console.log('⚠️ === NO HAY DATOS REALES ===')
        setShouldStopTrying(true) // Marcar para parar futuros intentos
        setData(createEmptyData())
        setLoading(false)
        return
      }

      // Procesar datos y actualizar estado (ahora rawData ya incluye las variaciones)
      const processedData = processChartData(rawData, range, savingsParams)
      setData(processedData)
      setLastUpdated(new Date())
      setError(null)
      
      // Reproducir sonido de éxito cuando se completan los datos
      if (rawData.totalEmails && rawData.totalEmails > 0) {
        playSuccess()
      }
      
      console.log('✅ === DATOS PROCESADOS Y GUARDADOS ===')
      console.log('🏁 === fetchData EJECUCIÓN COMPLETADA ===')
      
    } catch (error) {
      console.error('❌ === ERROR EN fetchData ===', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
      setData(createEmptyData())
      
      // Marcar para parar futuros intentos si hay error
      setShouldStopTrying(true)
      console.log('🏁 === fetchData EJECUCIÓN TERMINADA CON ERROR ===')
    } finally {
      setLoading(false)
      setIsFetching(false) // DESMARCAR QUE SE TERMINÓ DE EJECUTAR
    }
  }, [session?.access_token, selectedHotels]) // SOLO dependencias estables



  // Función para procesar y distribuir los datos de manera inteligente
  const processChartData = (rawData: any, range: DateRange, savingsParams?: { minutesPerEmail: number; hourlyRate: number }): DashboardData => {
    // Verificar que rawData tenga la estructura esperada
    if (!rawData || typeof rawData !== 'object') {
      console.error('❌ rawData no es un objeto válido:', rawData)
      return createEmptyData()
    }
    
    // Calcular días de diferencia para el texto
    const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
    const comparisonPeriodText = daysDiff === 1 ? 'ayer' : 
      daysDiff === 7 ? 'la semana anterior' :
      daysDiff === 30 ? 'el mes anterior' :
      daysDiff === 90 ? 'el trimestre anterior' :
      daysDiff === 365 ? 'el año anterior' :
      `los ${daysDiff} días anteriores`
    
    // Generar fechas inteligentes para las gráficas
    const intelligentDates = generateIntelligentDates(range, 7)
    
    // Procesar volumen de emails - Usar directamente los datos de la API
    const volumeData = rawData.volume || []



    // SLA por tramos (convertir a porcentajes)
    
    // Calcular el total de emails para calcular porcentajes
    // Los datos de SLA ya vienen procesados desde la API
    const slaTramData = rawData.slaTram || [
      { name: '<10min', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('<10min') },
      { name: '10min-1h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('10min-1h') },
      { name: '1-4h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('1-4h') },
      { name: '4-24h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('4-24h') },
      { name: '>24h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('>24h') }
    ]

    const result: DashboardData = {
      // Información del período de comparación
      comparisonPeriodText: comparisonPeriodText,
      
      // KPIs principales (las variaciones ya vienen de la API)
      totalEmails: rawData.totalEmails || 0,
      totalEmailsVariation: rawData.totalEmailsVariation || undefined,
      
      customerSatisfaction: rawData.customerSatisfaction || 0,
      customerSatisfactionVariation: rawData.customerSatisfactionVariation || undefined,
      unansweredEmailsPercentage: rawData.unansweredEmailsPercentage || 0,
      unansweredEmailsPercentageVariation: rawData.unansweredEmailsPercentageVariation || undefined,
      
      sla10min: rawData.sla10min || null,
      sla10minVariation: rawData.sla10minVariation || undefined,
      
      avgResponseTime: rawData.avgResponseTime || null,
      avgResponseTimeVariation: rawData.avgResponseTimeVariation || undefined,
      
      upsellingRevenue: rawData.upsellingRevenue || 0,
      upsellingRevenueVariation: rawData.upsellingRevenueVariation || undefined,
      

      
      // KPIs adicionales con variaciones (ya vienen de la API)
      interventionPercentage: rawData.interventionPercentage || 0,
      interventionPercentageVariation: rawData.interventionPercentageVariation || undefined,
      
      personalSavings: rawData.personalSavings || 0,
      personalSavingsVariation: rawData.personalSavingsVariation || undefined,
      
      // Datos para gráficas
      volume: volumeData,
      slaTram: slaTramData,
      sentiment: rawData.sentiment || [],
      language: rawData.language || [],
      category: rawData.category || [],
      
      // Upselling

      
      // Revenue por mes para gráfico de barras
      upsellingRevenueByMonth: rawData.upsellingRevenueByMonth || [],
      
      // Upselling por mes (ofertas enviadas y conversión)
      upsellingByMonth: rawData.upsellingByMonth || [],
      
      // Variaciones para KPIs de upselling
      upsellingVariations: rawData.upsellingVariations || undefined,
      
      // Incidencias (las variaciones ya vienen de la API)
      incidencias: {
        total: rawData.incidencias?.total || 0,
        totalVariation: rawData.incidencias?.totalVariation || undefined,
        
        reviewClicks: rawData.incidencias?.reviewClicks || 0,
        reviewClicksVariation: rawData.incidencias?.reviewClicksVariation || undefined,
        
        avgManagementDelay: rawData.incidencias?.avgManagementDelay || 0,
        avgManagementDelayVariation: rawData.incidencias?.avgManagementDelayVariation || undefined,
        
        avgResolutionDelay: rawData.incidencias?.avgResolutionDelay || 0,
        avgResolutionDelayVariation: rawData.incidencias?.avgResolutionDelayVariation || undefined,
        
        incidenciasPorSubcategoria: rawData.incidencias?.incidenciasPorSubcategoria || [],
        porMes: rawData.incidencias?.porMes || []
      }
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
      customerSatisfaction: 0,
      customerSatisfactionVariation: undefined,
      unansweredEmailsPercentage: 0,
      unansweredEmailsPercentageVariation: undefined,
      sla10min: 0,
      avgResponseTime: 0,
      upsellingRevenue: 0,
      
      // KPIs adicionales con variaciones
      interventionPercentage: 0,
      personalSavings: 0,
      
      // Datos para gráficas
      volume: emptyDates.map(date => ({ name: formatChartDate(date, dateRange), total: 0, automatic: 0 })),
      slaTram: [
        { name: '<10min', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('<10min') },
        { name: '10min-1h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('10min-1h') },
        { name: '1-4h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('1-4h') },
        { name: '4-24h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('4-24h') },
        { name: '>24h', value: 0, totalEmailsPeriod: 0, color: getSlaTramColor('>24h') }
      ],
      sentiment: [],
      language: [],
      category: [],
      
      // Revenue por mes para gráfico de barras
      upsellingRevenueByMonth: [],
      
      // Upselling por mes (ofertas enviadas y conversión)
      upsellingByMonth: [],
      
      // Incidencias
      incidencias: {
        total: 0,
        totalVariation: undefined,
        reviewClicks: 0,
        reviewClicksVariation: undefined,
        avgManagementDelay: 0,
        avgManagementDelayVariation: undefined,
        avgResolutionDelay: 0,
        avgResolutionDelayVariation: undefined,
        incidenciasPorSubcategoria: [],
        porMes: []
      }
    }
  }

  const refreshData = useCallback(async () => {
    try {
      console.log('🔄 === FUNCIÓN refreshData EJECUTADA ===')
      console.log('📋 Parámetros actuales:')
      console.log('  - Rango de fechas:', dateRange)
      console.log('  - Hoteles seleccionados:', selectedHotels)
      console.log('  - Intervalo:', currentInterval)
      
      // NO resetear hasAttemptedLoad para mantener el control
      setShouldStopTrying(false) // Permitir nuevos intentos
      
      // Usar los parámetros ACTUALES del estado
      console.log('📍 === LLAMANDO A fetchData DESDE refreshData ===')
      console.log('🔒 Estado antes de fetchData:', { isFetching, hasAttemptedLoad, shouldStopTrying })
      await fetchData(dateRange, currentInterval)
      
      // Mostrar notificación de éxito
      showSuccess('Datos actualizados correctamente')
      // Reproducir sonido de click
      playClick()
    } catch (error) {
      console.error('❌ Error al actualizar datos:', error)
    }
  }, [dateRange, currentInterval, selectedHotels, showSuccess, playSuccess]) // NO incluir fetchData

  const resetDataState = useCallback(() => {
    setShouldStopTrying(false)
    setHasAttemptedLoad(false)
    setError(null)
    setData(null)
  }, [])



  const updateDateRange = useCallback(async (from: Date, to: Date) => {
    const newRange = { from, to }
    console.log('📅 === FUNCIÓN updateDateRange EJECUTADA ===')
    
    // Actualizar el estado local primero
    setDateRange(newRange)
    
    // El usuario debe presionar "Actualizar" para cargar nuevos datos
    console.log('💡 Para ver datos con nuevas fechas, presiona el botón "Actualizar"')
  }, [])

  const updateInterval = useCallback((interval: string) => {
    console.log('⏰ === FUNCIÓN updateInterval EJECUTADA ===')
    console.log('📋 Nuevo intervalo:', interval)
    
    // SOLO actualizar el estado local - NO fetchData
    setCurrentInterval(interval)
    
    // El usuario debe presionar "Actualizar" para cargar nuevos datos
    console.log('💡 Para ver datos con nuevo intervalo, presiona el botón "Actualizar"')
  }, [])

  // SOLO actualizar estado local - NO llamar a fetchData automáticamente
  const updateSelectedHotels = useCallback((hotels: string[]) => {
    console.log('🏨 === FUNCIÓN updateSelectedHotels EJECUTADA ===')
    console.log('📋 Nuevos hoteles:', hotels)
    
    // SOLO actualizar el estado local - NO fetchData
    // Nota: selectedHotels viene del contexto SupabaseProvider
    console.log('💡 Para ver datos con nuevos hoteles, presiona el botón "Actualizar"')
  }, [])

  // Asegurar que siempre devolvemos valores válidos
      const safeDateRange = dateRange || (() => {
      const now = new Date()
      const from = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)) // 30 días atrás
      return { from, to: now }
    })()
  const safeLastUpdated = lastUpdated || new Date()

  return {
    data,
    loading,
    error,
    dateRange: safeDateRange,
    lastUpdated: safeLastUpdated,
    currentInterval,
    hasAttemptedLoad,
    shouldStopTrying,
    refreshData,
    updateDateRange,
    updateInterval,
    updateSelectedHotels,
    resetDataState
  }
}
