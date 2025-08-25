'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Header } from '@/components/dashboard/Header'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { BarChart } from '@/components/dashboard/BarChart'
import { DynamicBarChart } from '@/components/dashboard/DynamicBarChart'
import { DonutChart } from '@/components/dashboard/DonutChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { useRealDashboardData } from '@/hooks/useRealDashboardData'
import { useClientTime } from '@/hooks/useClientTime'
import { useSound } from '@/hooks/useSound'
import { ParticlesBackground } from '@/components/ui/ParticlesBackground'
import { getSentimentColor, getLanguageColor, getCategoryColor, getSlaTramColor, getIncidentColor, getIncidentSubcategoryColor } from '@/lib/chart-colors'
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard'

export default function HomePage() {
  const { session, loading: authLoading, user, hotelId, userName, userRole } = useSupabase()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { toasts, removeToast, showSuccess } = useToast()
  const hasShownWelcome = useRef(false)
  const [savingsAssumptions, setSavingsAssumptions] = useState({ 
    minutesPerEmail: 5, 
    hourlyRate: 20, 
    showConfig: false 
  })
  const { currentTime, mounted: timeMounted } = useClientTime()
  const { playClick, playSuccess } = useSound()





  // Función para agrupar idiomas menores como "Otros"
  const processLanguageData = (languageData: any[]) => {
    if (!languageData || languageData.length === 0) return []
    
    // Ordenar por valor descendente
    const sortedData = [...languageData].sort((a, b) => b.value - a.value)
    
    // Si hay más de 5 idiomas, agrupar los menores como "Otros"
    if (sortedData.length > 5) {
      const topLanguages = sortedData.slice(0, 4)
      const otherLanguages = sortedData.slice(4)
      const otherTotal = otherLanguages.reduce((sum, item) => sum + item.value, 0)
      
      return [
        ...topLanguages,
        { name: 'Otros', value: otherTotal }
      ]
    }
    
    return sortedData
  }

  // Hook para manejar los datos del dashboard
  const {
    data: dashboardData,
    loading: dataLoading,
    dateRange,
    lastUpdated,
    currentInterval,
    refreshData,
    updateDateRange,
    updateInterval,
    error
  } = useRealDashboardData(savingsAssumptions)

  // Calcular ahorro en tiempo real basado en los parámetros configurados
  const calculatedSavings = dashboardData ? 
    (dashboardData.totalEmails * savingsAssumptions.minutesPerEmail / 60) * savingsAssumptions.hourlyRate : 0

  // Calcular ingresos extra totales (upselling + ahorro personal)
  const totalExtraIncome = (dashboardData?.upsellingRevenue || 0) + calculatedSavings

  // Calcular variación de ingresos extra totales
  const totalExtraIncomeVariation = dashboardData?.upsellingRevenueVariation ? {
    percentage: Number((dashboardData.upsellingRevenueVariation.percentage).toFixed(1)),
    isIncrease: dashboardData.upsellingRevenueVariation.isIncrease
  } : undefined

  // Efecto para reproducir sonido de éxito solo cuando se carguen datos inicialmente
  useEffect(() => {
    if (dashboardData && !dataLoading && lastUpdated && !hasShownWelcome.current) {
      playSuccess()
      hasShownWelcome.current = true
    }
  }, [dashboardData, dataLoading, lastUpdated, playSuccess])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || authLoading) return

    if (!session) {
      console.log('👤 Usuario no autenticado, redirigiendo a login...')
      router.push('/login')
    }
  }, [session, authLoading, router, mounted])

  useEffect(() => {
    // Mostrar notificación de bienvenida solo una vez
    if (user && !hasShownWelcome.current) {
      hasShownWelcome.current = true
      showSuccess(
        `¡Bienvenido al Dashboard! Hola ${userName || user.email}, has iniciado sesión correctamente.`
      )
    }
  }, [user, userName, showSuccess])

  // Logs para debug
  useEffect(() => {
    console.log('📊 Dashboard state:', {
      mounted,
      authLoading,
      session: !!session,
      dataLoading,
      hasData: !!dashboardData,
      user: user?.email,
      userName,
      hotelId,
      userRole
    })
    
    // Log específico para el nombre del usuario
    if (user?.email) {
      console.log('👤 Usuario detectado:', {
        email: user.email,
        userName,
        hotelId,
        userRole
      })
    }
  }, [mounted, authLoading, session, dataLoading, dashboardData, user, userName, hotelId, userRole])

  // Debug específico para incidencias
  useEffect(() => {
    if (dashboardData?.incidencias) {
      console.log('🚨 Debug Incidencias:', {
        total: dashboardData.incidencias.total,
        incidenciasPorSubcategoria: dashboardData.incidencias.incidenciasPorSubcategoria,
        incidenciasPorSubcategoriaLength: dashboardData.incidencias.incidenciasPorSubcategoria?.length,
        porMes: dashboardData.incidencias.porMes,
        avgManagementDelay: dashboardData.incidencias.avgManagementDelay,
        avgResolutionDelay: dashboardData.incidencias.avgResolutionDelay
      })
      
      // Debug específico para el mapeo del DonutChart
      if (dashboardData.incidencias.incidenciasPorSubcategoria) {
        console.log('🔍 Debug Mapeo DonutChart:')
        const mappedData = dashboardData.incidencias.incidenciasPorSubcategoria.map((item) => ({
          name: item.name,
          value: Number(item.value) || 0,
          color: getIncidentSubcategoryColor(item.name)
        }))
        console.log('  📊 Datos originales:', dashboardData.incidencias.incidenciasPorSubcategoria)
        console.log('  🎨 Datos mapeados:', mappedData)
        console.log('  🎯 Total de valores:', mappedData.reduce((sum, item) => sum + item.value, 0))
      }
    }
  }, [dashboardData?.incidencias])

  // Debug específico para volumen
  useEffect(() => {
    if (dashboardData?.volume) {
      console.log('📊 Debug Volumen:', {
        volume: dashboardData.volume,
        volumeLength: dashboardData.volume?.length,
        primerItem: dashboardData.volume[0],
        ultimoItem: dashboardData.volume[dashboardData.volume.length - 1]
      })
    }
  }, [dashboardData?.volume])



  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-smarthotels-marble flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-smarthotels-gold mx-auto"></div>
          <p className="mt-4 text-smarthotels-text">Cargando...</p>
          <p className="mt-2 text-sm text-gray-500">Inicializando sistema...</p>
        </div>
      </div>
    )
  }

  // Si no hay sesión, no mostrar nada (se redirige a login)
  if (!session) {
    return null
  }

  // Si no hay datos del dashboard, mostrar skeleton
  if (!dashboardData) {
    console.log('🔄 No hay datos del dashboard, mostrando skeleton')
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          dateRange={dateRange}
          onDateChange={updateDateRange}
          onRefresh={refreshData}
          onIntervalChange={updateInterval}
          loading={dataLoading}
          lastUpdated={lastUpdated}
          currentInterval={currentInterval}
        />
        <main className="pt-24 px-4 pb-4">
          <div className="max-w-7xl mx-auto">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    )
  }

  // Mostrar el dashboard principal
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Fondo de partículas doradas */}
      <ParticlesBackground />
      
      <Header
            dateRange={dateRange}
            onDateChange={updateDateRange}
            onRefresh={refreshData}
            onIntervalChange={updateInterval}
            loading={dataLoading}
            lastUpdated={lastUpdated}
            currentInterval={currentInterval}
          />
      
      <main className="pt-20 px-4 pb-4 relative z-20">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Banner - Professional Hotel Management */}
          <div className="bg-white rounded-2xl mb-8 mt-12 shadow-2xl border-2 border-smarthotels-gold overflow-hidden">
            {/* Gold Accent Line */}
            <div className="h-2 bg-gradient-to-r from-smarthotels-gold via-yellow-400 to-smarthotels-gold"></div>
            
            <div className="p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Left Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-smarthotels-gold to-yellow-400 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-1">
                        ¡Bienvenido, {userName || 'Director'}!
                      </h1>
                      <p className="text-sm text-slate-600 font-medium">
                        Panel de Control Ejecutivo • SmartHotels
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-slate-700 text-lg">
                      Optimice sus operaciones y maximice ingresos con datos
                      <span className="text-smarthotels-gold font-semibold"> en tiempo real</span>
                    </p>
                    {dashboardData?.comparisonPeriodText && (
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <svg className="w-4 h-4 text-smarthotels-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Variaciones calculadas con respecto a {dashboardData.comparisonPeriodText}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Content - Quick Stats */}
                <div className="lg:flex-shrink-0">
                  <div className="grid grid-cols-2 gap-4">
                    <QuickStatsCard
                      value={dashboardData.totalEmails || 0}
                      label="Emails Procesados"
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                      trend={dashboardData.totalEmailsVariation ? {
                        value: Number((dashboardData.totalEmailsVariation.percentage).toFixed(1)),
                        isPositive: dashboardData.totalEmailsVariation.isIncrease
                      } : undefined}
                    />
                    <QuickStatsCard
                      value={`${totalExtraIncome.toFixed(1)}€`}
                      label="Ingresos Extra"
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      }
                      trend={totalExtraIncomeVariation ? {
                        value: totalExtraIncomeVariation.percentage,
                        isPositive: totalExtraIncomeVariation.isIncrease
                      } : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <span className="text-lg">⚠️</span>
                <span className="font-medium">Error al cargar datos:</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Título del Resumen General */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Resumen General</h2>

          {/* KPIs Row 1 - Métricas principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-w-6xl mx-auto">
            <KpiCard
              title="Total Emails"
              value={dashboardData.totalEmails !== null ? dashboardData.totalEmails : 'Sin datos'}
              subtitle="En el período seleccionado"
              variation={dashboardData.totalEmailsVariation}
              icon="📧"
            />
            
            <KpiCard
              title="Tiempo Medio Respuesta"
              value={dashboardData.avgResponseTime !== null ? `${dashboardData.avgResponseTime.toFixed(1)} min` : 'Sin datos'}
              subtitle="Promedio en el período"
              variation={dashboardData.avgResponseTimeVariation}
              icon="⏱️"
            />
            
            <KpiCard
              title="SLA <10min"
              value={dashboardData.sla10min !== null ? `${dashboardData.sla10min.toFixed(1)}%` : 'Sin datos'}
              subtitle="Respuesta rápida"
              variation={dashboardData.sla10minVariation}
              icon="🎯"
            />
          </div>

          {/* KPIs Row 2 - Métricas adicionales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-w-6xl mx-auto">
            <KpiCard
              title="Ingresos Upselling"
              value={`${dashboardData.upsellingRevenue.toFixed(2)}€`}
              subtitle="Revenue adicional"
              variation={dashboardData.upsellingRevenueVariation}
              icon="💰"
            />
            
            <KpiCard
              title="💰 Ahorro en Personal"
              value={`${calculatedSavings.toFixed(2)}€`}
              subtitle={`${savingsAssumptions.minutesPerEmail}min/email × ${savingsAssumptions.hourlyRate}€/h × Total emails`}
              variation={dashboardData.personalSavingsVariation}
              extraContent={
              <button
                onClick={() => setSavingsAssumptions(prev => ({ ...prev, showConfig: true }))}
                  className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 bg-white border-2 border-smarthotels-gold text-smarthotels-gold text-xs font-medium rounded-lg hover:bg-smarthotels-gold hover:text-white transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-smarthotels-gold-lg"
                  title="Configurar parámetros de ahorro"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826-3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              }
            />
            
            <KpiCard
              title="👥 % Intervención Manual"
              value={`${dashboardData.interventionPercentage.toFixed(1)}%`}
              subtitle="Requieren supervisión"
              variation={dashboardData.interventionPercentageVariation}
            />
          </div>

          {/* Modal de Configuración de Ahorro */}
          {savingsAssumptions.showConfig && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-20">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 max-h-[80vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-white border-b-2 border-smarthotels-gold p-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Configurar Cálculo de Ahorro</h3>
                      <p className="text-slate-600 text-xs mt-1">
                        Personaliza los parámetros para tu hotel
                      </p>
                    </div>
                    <button
                      onClick={() => setSavingsAssumptions(prev => ({ ...prev, showConfig: false }))}
                      className="text-slate-400 hover:text-smarthotels-gold transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Minutos por Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      ⏱️ Tiempo por Email
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={savingsAssumptions.minutesPerEmail}
                        onChange={(e) => setSavingsAssumptions(prev => ({
                          ...prev,
                          minutesPerEmail: parseInt(e.target.value) || 5
                        }))}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-smarthotels-gold focus:ring-2 focus:ring-smarthotels-gold/20 transition-all duration-200 text-base font-medium"
                        placeholder="5"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm">
                        min
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Tiempo promedio que tarda un empleado en gestionar un email (considerando todos los emails del período)
                    </p>
                  </div>
                  
                  {/* Precio por Hora */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      💰 Precio Bruto por Hora
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={savingsAssumptions.hourlyRate}
                        onChange={(e) => setSavingsAssumptions(prev => ({
                          ...prev,
                          hourlyRate: parseFloat(e.target.value) || 20
                        }))}
                        className="w-full px-3 py-2 border-2 border-gray-2 focus:border-smarthotels-gold focus:ring-2 focus:ring-smarthotels-gold/20 transition-all duration-200 text-base font-medium"
                        placeholder="20.00"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm">
                        €/h
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Coste bruto por hora de personal del hotel
                    </p>
                  </div>
                  
                  {/* Preview del Cálculo */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg border border-smarthotels-gold/30">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">📊 Vista Previa del Cálculo</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Emails:</span>
                        <span className="font-medium">{dashboardData?.totalEmails || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tiempo total:</span>
                        <span className="font-medium">
                          {dashboardData ? ((dashboardData.totalEmails * savingsAssumptions.minutesPerEmail) / 60).toFixed(1) : '0.0'}h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Ahorro estimado:</span>
                        <span className="font-medium text-smarthotels-gold font-bold">
                          {dashboardData ? ((dashboardData.totalEmails * savingsAssumptions.minutesPerEmail / 60) * savingsAssumptions.hourlyRate).toFixed(2) : '0.00'}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="px-4 pb-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSavingsAssumptions(prev => ({ ...prev, showConfig: false }))}
                      className="flex-1 px-3 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setSavingsAssumptions(prev => ({ ...prev, showConfig: false }))}
                      className="flex-1 px-3 py-2 bg-smarthotels-gold text-white rounded-lg font-medium hover:bg-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-smarthotels-gold-lg"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Experience Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">⭐ Customer Experience</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartCard
                title="Análisis de Sentimiento"
                subtitle="Distribución por sentimiento detectado"
              >
                <DonutChart
                  data={(() => {
                    // Orden fijo para los sentimientos
                    const sentimentOrder = ['Muy Positivo', 'Positivo', 'Medio', 'Negativo', 'Muy Negativo']
                    
                    // Crear un mapa con los datos existentes
                    const sentimentMap = new Map(
                      dashboardData.sentiment.map(item => [item.name, item])
                    )
                    
                    // Crear el array en el orden fijo, con 0 para los que no existen
                    const orderedData = sentimentOrder.map(sentimentName => {
                      const existingData = sentimentMap.get(sentimentName)
                      const color = getSentimentColor(sentimentName)
                      
                      return {
                        name: sentimentName,
                        value: existingData?.value || 0,
                        color: color
                      }
                    })
                    
                    return orderedData
                  })()}
                  height={250}
                />
              </ChartCard>

              <ChartCard
                title="Idiomas de Comunicación"
                subtitle="Emails por idioma detectado"
              >
                <DonutChart
                  data={processLanguageData(dashboardData.language.map(item => ({
                    name: item.name,
                    value: item.value,
                    color: getLanguageColor(item.name)
                  })))}
                  height={250}
                />
              </ChartCard>

              <ChartCard
                title="Categorías Principales"
                subtitle="Distribución por categoría de email"
              >
                <DonutChart
                  data={dashboardData.category.map(item => {
                    const color = getCategoryColor(item.name)
                    // Mostrar "Reservas" en lugar de "Estancia" para el usuario
                    const displayName = item.name === 'Estancia' ? 'Reservas' : item.name
                    return {
                      name: displayName,
                    value: item.value,
                      color: color
                    }
                  })}
                  height={250}
                />
              </ChartCard>
            </div>
          </div>

          {/* Rendimiento IA Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🤖 Rendimiento IA</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title={`Volumen Automático vs Total (por ${dashboardData.volume[0]?.intervalName?.toLowerCase() || 'período'})`}
                subtitle={`Cada punto representa un ${dashboardData.volume[0]?.intervalName?.toLowerCase() || 'período'} completo con fechas exactas`}
              >
                <LineChart
                  data={dashboardData.volume.map(item => ({
                    name: item.name,
                    value: item.total, // Campo requerido por LineChart
                    total: item.total,
                    automatic: item.automatic,
                    unanswered: item.unanswered || 0,
                    intervalType: item.intervalType,
                    startDate: item.startDate,
                    endDate: item.endDate
                  }))}
                  lines={[
                    { key: 'total', color: '#3B82F6', label: 'Total' },
                    { key: 'automatic', color: '#10B981', label: 'Automático' },
                    { key: 'unanswered', color: '#EF4444', label: 'Sin Responder' }
                  ]}
                  height={300}
                  showDetailedTooltip={true}
                />
              </ChartCard>

              <ChartCard
                title="Distribución SLA Completa"
                subtitle="Porcentaje de emails por tramo de tiempo de respuesta"
              >
                <BarChart
                  data={dashboardData.slaTram.map((item) => ({
                    name: item.name,
                    value: item.value,
                    color: getSlaTramColor(item.name)
                  }))}
                  title="Distribución SLA por Tramos (%)"
                  height={300}
                />
              </ChartCard>
            </div>
          </div>

          {/* Upselling Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Oportunidades de Revenue - Upselling</h2>
            
            {/* Gráficos de upselling lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de líneas usando LineChart */}
              <ChartCard
                title={`Ofertas Enviadas vs Convertidas por ${dashboardData.upsellingByMonth[0]?.intervalName?.toLowerCase() || 'Mes'}`}
                subtitle={`Ofertas enviadas y ofertas convertidas - ${dashboardData.upsellingByMonth[0]?.intervalName || 'Período'} a ${dashboardData.upsellingByMonth[0]?.intervalName?.toLowerCase() || 'período'}`}
              >
                <LineChart
                  data={dashboardData.upsellingByMonth.map(item => ({
                    name: item.name,
                    value: item.offersSent, // Campo requerido por LineChart
                    offersSent: item.offersSent,
                    offersConverted: Math.round((item.offersSent * item.conversionRate) / 100),
                    conversionRate: item.conversionRate,
                    intervalType: item.intervalType,
                    totalEmails: dashboardData.totalEmails
                  }))}
                  lines={[
                    { key: 'offersSent', color: '#3B82F6', label: 'Ofertas Enviadas' },
                    { key: 'offersConverted', color: '#10B981', label: 'Ofertas Convertidas' }
                  ]}
                  height={250}
                  showDetailedTooltip={true}
                />
                
                {/* Información adicional debajo del gráfico */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">
                      {dashboardData.upsellingByMonth && dashboardData.upsellingByMonth.length > 0 
                        ? dashboardData.upsellingByMonth.reduce((sum, item) => sum + item.offersSent, 0)
                        : 0}
                    </div>
                    <div className="text-sm text-blue-600">Total Enviadas</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">
                      {dashboardData.upsellingByMonth && dashboardData.upsellingByMonth.length > 0 
                        ? dashboardData.upsellingByMonth.reduce((sum, item) => {
                            const converted = Math.round((item.offersSent * item.conversionRate) / 100)
                            return sum + converted
                          }, 0)
                        : 0}
                    </div>
                    <div className="text-sm text-green-600">Total Convertidas</div>
                  </div>
                </div>
              </ChartCard>
              
              {/* Gráfico de barras dinámico con ganancias estimadas */}
              <ChartCard
                title={`Ganancias Cross-Selling por ${dashboardData.upsellingRevenueByMonth[0]?.intervalName?.toLowerCase() || 'Mes'}`}
                subtitle={`Estimación basada en ofertas aceptadas - ${dashboardData.upsellingRevenueByMonth[0]?.intervalName || 'Período'} a ${dashboardData.upsellingRevenueByMonth[0]?.intervalName?.toLowerCase() || 'período'}`}
              >
                <DynamicBarChart
                  data={dashboardData.upsellingRevenueByMonth.map(item => ({
                    name: item.name,
                    value: item.value,
                    intervalType: item.intervalType,
                    intervalName: item.intervalName
                  }))}
                  height={250}
                  showDetailedTooltip={true}
                />
              </ChartCard>
            </div>
          </div>

          {/* Incidencias Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🚨 Gestión de Incidencias</h2>
            
            {/* KPIs de Incidencias */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <KpiCard
                title="Total Incidencias"
                value={dashboardData.incidencias.total}
                variation={dashboardData.incidencias.totalVariation}
              />
              
              <KpiCard
                title="Tiempo Promedio Gestión"
                value={`${dashboardData.incidencias.avgManagementDelay} min`}
                variation={dashboardData.incidencias.avgManagementDelayVariation}
              />
              
              <KpiCard
                title="Tiempo Promedio Resolución"
                value={`${dashboardData.incidencias.avgResolutionDelay} min`}
                variation={dashboardData.incidencias.avgResolutionDelayVariation}
              />
              
              <KpiCard
                title="Clicks Reseña"
                value={dashboardData.incidencias.reviewClicks}
                variation={dashboardData.incidencias.reviewClicksVariation}
              />
            </div>
            
            {/* Gráficas de Incidencias */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Incidencias por Subcategoría"
                subtitle="Distribución por tipo de incidencia"
              >
                <DonutChart
                  data={dashboardData.incidencias.incidenciasPorSubcategoria?.map((item) => ({
                    name: item.name,
                    value: Number(item.value) || 0,
                    color: getIncidentSubcategoryColor(item.name)
                  })) || []}
                  height={300}
                  startAngle={90}
                />
                

                
                {/* Mostrar datos si no hay gráfica */}
                {(!dashboardData.incidencias.incidenciasPorSubcategoria || dashboardData.incidencias.incidenciasPorSubcategoria.length === 0) && (
                  <div className="mt-4 text-center text-gray-500">
                    <p>No hay datos de incidencias disponibles</p>
                    <p className="text-sm">Total incidencias: {dashboardData.incidencias.total}</p>
                  </div>
                )}
              </ChartCard>
              
              <ChartCard
                title={`Evolución de Incidencias por ${dashboardData.incidencias.porMes[0]?.intervalName?.toLowerCase() || 'Mes'}`}
                subtitle={`Total de incidencias y tiempos de respuesta - ${dashboardData.incidencias.porMes[0]?.intervalName || 'Período'} a ${dashboardData.incidencias.porMes[0]?.intervalName?.toLowerCase() || 'período'}`}
              >
                <LineChart
                  data={dashboardData.incidencias.porMes.map(item => ({
                    name: item.name,
                    value: item.totalIncidents,
                    managementDelay: item.avgManagementDelay,
                    resolutionDelay: item.avgResolutionDelay,
                    intervalType: item.intervalType
                  }))}
                  lines={[
                    { key: 'value', color: '#EF4444', label: 'Total Incidencias' },
                    { key: 'managementDelay', color: '#F59E0B', label: 'Tiempo Gestión (min)' },
                    { key: 'resolutionDelay', color: '#8B5CF6', label: 'Tiempo Resolución (min)' }
                  ]}
                  height={300}
                  showDetailedTooltip={true}
                />
              </ChartCard>
            </div>
          </div>

          {/* Estado del Sistema - Al final */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Estado del Sistema</h2>
            
            {/* Información del Usuario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Información del Usuario</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-medium">{userName || 'No asignado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hotel ID:</span>
                    <span className="font-medium">{hotelId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rol:</span>
                    <span className="font-medium">{userRole || 'Usuario'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Estado del Sistema</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Última Actualización:</span>
                    <span className="text-sm">{lastUpdated.toLocaleString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sesión Activa:</span>
                    <span className="font-medium text-green-600">✅ Activa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conexión BD:</span>
                    <span className="font-medium text-green-600">✅ Conectada</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">API Status:</span>
                    <span className="font-medium text-green-600">✅ Funcionando</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sistema de Notificaciones */}
      <ToastContainer 
        toasts={toasts.map(toast => ({
          ...toast,
          onClose: removeToast
        }))} 
        onClose={removeToast} 
      />
    </div>
  )
}
