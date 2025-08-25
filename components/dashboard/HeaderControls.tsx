'use client'

import { Button } from '@/components/ui/Button'
import { RefreshCw, Calendar, Clock, BarChart3 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { useSound } from '@/hooks/useSound'

interface HeaderControlsProps {
  dateRange?: { from: Date; to: Date }
  onDateChange?: (from: Date, to: Date) => void
  onRefresh?: () => void
  onIntervalChange?: (interval: string) => void
  loading?: boolean
  lastUpdated?: Date
  currentInterval?: string
}

export function HeaderControls({ 
  dateRange, 
  onDateChange, 
  onRefresh, 
  onIntervalChange,
  loading, 
  lastUpdated,
  currentInterval: propCurrentInterval = 'auto'
}: HeaderControlsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [showIntervalPicker, setShowIntervalPicker] = useState(false)
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const [localCurrentInterval, setLocalCurrentInterval] = useState<string>(propCurrentInterval)
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('')
  const { showSuccess, showError } = useToast()
  const { playSuccess } = useSound()
  const datePickerRef = useRef<HTMLDivElement>(null)
  const intervalPickerRef = useRef<HTMLDivElement>(null)

  // Sincronizar el estado local con las props
  useEffect(() => {
    setLocalCurrentInterval(propCurrentInterval)
  }, [propCurrentInterval])

  // Valores por defecto para evitar errores cuando dateRange es undefined
  const safeDateRange = dateRange || {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
    to: new Date()
  }

  // Inicializar el preset seleccionado cuando se abre el picker
  useEffect(() => {
    if (showDatePicker) {
      // Determinar qué preset está activo basado en el rango actual
      const now = new Date()
      const from = safeDateRange.from
      const to = safeDateRange.to
      
      const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 7) {
        setSelectedDatePreset('last-week')
      } else if (daysDiff === 30) {
        setSelectedDatePreset('last-month')
      } else if (daysDiff === 90) {
        setSelectedDatePreset('last-quarter')
      } else if (daysDiff === 365) {
        setSelectedDatePreset('last-year')
      } else if (from.getFullYear() === now.getFullYear() && from.getMonth() === 0 && from.getDate() === 1) {
        setSelectedDatePreset('ytd')
      } else {
        setSelectedDatePreset('')
      }
    }
  }, [showDatePicker, safeDateRange])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
        setShowCustomPicker(false)
      }
      if (intervalPickerRef.current && !intervalPickerRef.current.contains(event.target as Node)) {
        setShowIntervalPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Inicializar fechas personalizadas cuando se abre
  useEffect(() => {
    if (showCustomPicker) {
      setCustomFrom(safeDateRange.from.toISOString().split('T')[0])
      setCustomTo(safeDateRange.to.toISOString().split('T')[0])
    }
  }, [showCustomPicker, safeDateRange])

  const handleQuickDate = (preset: string) => {
    setSelectedDatePreset(preset)
  }

  const applySelectedDatePreset = () => {
    if (!selectedDatePreset || !onDateChange) return
    
    const now = new Date()
    let from: Date
    
    switch (selectedDatePreset) {
      case 'last-week':
        from = new Date(now)
        from.setDate(now.getDate() - 7)
        break
      case 'last-month':
        from = new Date(now)
        from.setMonth(now.getMonth() - 1)
        break
      case 'last-quarter':
        from = new Date(now)
        from.setMonth(now.getMonth() - 3)
        break
      case 'last-year':
        from = new Date(now)
        from.setFullYear(now.getFullYear() - 1)
        break
      case 'ytd':
        from = new Date(now.getFullYear(), 0, 1)
        break
      default:
        from = new Date(now)
        from.setDate(now.getDate() - 7)
    }
    
    onDateChange(from, now)
    setShowDatePicker(false)
    setShowCustomPicker(false)
    playSuccess()
    showSuccess('Período de fechas actualizado correctamente')
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
      playSuccess()
      showSuccess('Datos actualizados correctamente')
    }
  }

  const handlePersonalizado = () => {
    setShowCustomPicker(true)
    setShowDatePicker(false)
  }

  const handleCustomDateChange = () => {
    if (!customFrom || !customTo) {
      showError('Por favor, selecciona ambas fechas')
      return
    }

    const fromDate = new Date(customFrom)
    const toDate = new Date(customTo)
    const now = new Date()

    // Validar que las fechas no sean futuras
    if (fromDate > now || toDate > now) {
      showError('No se pueden seleccionar fechas futuras')
      return
    }

    // Validar que la fecha inicial sea anterior a la final
    if (fromDate >= toDate) {
      showError('La fecha inicial debe ser anterior a la fecha final')
      return
    }

    // Aplicar el cambio
    if (onDateChange) {
      onDateChange(fromDate, toDate)
    }
    setShowCustomPicker(false)
    playSuccess()
    showSuccess('Rango de fechas actualizado correctamente')
  }

  const handleIntervalChange = (interval: string) => {
    if (onIntervalChange) {
      onIntervalChange(interval)
      playSuccess()
      showSuccess(`Intervalo cambiado a: ${getIntervalDisplayName(interval)}`)
    }
    setShowIntervalPicker(false)
  }

  const getIntervalDisplayName = (interval: string) => {
    if (interval === 'auto') return 'Automático'
    
    // Extraer el tipo y la cantidad del intervalo
    const match = interval.match(/^(\w+)(\d+)$/)
    if (match) {
      const [, type, quantity] = match
      const quantityNum = parseInt(quantity)
      
      switch (type) {
        case 'day':
          return quantityNum === 1 ? '1 Día' : `${quantityNum} Días`
        case 'week':
          return quantityNum === 1 ? '1 Semana' : `${quantityNum} Semanas`
        case 'month':
          return quantityNum === 1 ? '1 Mes' : `${quantityNum} Meses`
        case 'year':
          return quantityNum === 1 ? '1 Año' : `${quantityNum} Años`
        default:
          return interval
      }
    }
    
    // Fallback para intervalos simples
    switch (interval) {
      case 'day': return '1 Día'
      case 'week': return '1 Semana'
      case 'month': return '1 Mes'
      case 'year': return '1 Año'
      default: return 'Automático'
    }
  }

  // Formatear período de manera ultra breve e intuitiva
  const formatPeriod = (from: Date, to: Date) => {
    const fromDay = from.getDate()
    const fromMonth = from.toLocaleDateString('es-ES', { month: 'short' })
    const toDay = to.getDate()
    const toMonth = to.toLocaleDateString('es-ES', { month: 'short' })
    
    if (fromMonth === toMonth) {
      return `${fromDay}-${toDay} ${fromMonth}`
    }
    return `${fromDay} ${fromMonth}-${toDay} ${toMonth}`
  }

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
      <div className="flex items-center gap-4">
        {/* Botón Fechas con Personalizado incluido */}
        <div className="relative" ref={datePickerRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="text-sm px-4 py-2 h-10 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Fechas
          </Button>
          
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-4 px-4 z-50 min-w-[320px]">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Seleccionar Período de Fechas</h3>
              
              <div className="space-y-4">
                {/* Opciones Rápidas */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Períodos Rápidos:</h4>
                  
                  {/* Última semana */}
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="last-week"
                        name="date-preset"
                        value="last-week"
                        checked={selectedDatePreset === 'last-week'}
                        onChange={() => handleQuickDate('last-week')}
                        className="text-smarthotels-gold focus:ring-smarthotels-gold"
                      />
                      <label htmlFor="last-week" className="text-sm font-medium text-gray-700">
                Última semana
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">7 días atrás</span>
                  </div>

                  {/* Último mes */}
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="last-month"
                        name="date-preset"
                        value="last-month"
                        checked={selectedDatePreset === 'last-month'}
                        onChange={() => handleQuickDate('last-month')}
                        className="text-smarthotels-gold focus:ring-smarthotels-gold"
                      />
                      <label htmlFor="last-month" className="text-sm font-medium text-gray-700">
                Último mes
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">30 días atrás</span>
                  </div>

                  {/* Último trimestre */}
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="last-quarter"
                        name="date-preset"
                        value="last-quarter"
                        checked={selectedDatePreset === 'last-quarter'}
                        onChange={() => handleQuickDate('last-quarter')}
                        className="text-smarthotels-gold focus:ring-smarthotels-gold"
                      />
                      <label htmlFor="last-quarter" className="text-sm font-medium text-gray-700">
                        Último trimestre
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">3 meses atrás</span>
                  </div>

                  {/* Último año */}
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="last-year"
                        name="date-preset"
                        value="last-year"
                        checked={selectedDatePreset === 'last-year'}
                        onChange={() => handleQuickDate('last-year')}
                        className="text-smarthotels-gold focus:ring-smarthotels-gold"
                      />
                      <label htmlFor="last-year" className="text-sm font-medium text-gray-700">
                        Último año
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">12 meses atrás</span>
                  </div>

                  {/* YTD */}
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="ytd"
                        name="date-preset"
                        value="ytd"
                        checked={selectedDatePreset === 'ytd'}
                        onChange={() => handleQuickDate('ytd')}
                        className="text-smarthotels-gold focus:ring-smarthotels-gold"
                      />
                      <label htmlFor="ytd" className="text-sm font-medium text-gray-700">
                        YTD
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">Año actual</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-200"></div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDatePicker(false)}
                    className="flex-1 text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={applySelectedDatePreset}
                    disabled={!selectedDatePreset}
                    className="flex-1 text-sm bg-smarthotels-gold hover:bg-yellow-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aplicar
                  </Button>
                </div>

                {/* Opción Personalizado */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                onClick={handlePersonalizado}
                    className="w-full text-sm"
              >
                Personalizado
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Interfaz directa para fechas personalizadas */}
          {showCustomPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-4 px-4 z-50 min-w-[320px]">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Seleccionar Fechas Personalizadas</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold text-sm"
                  />
                </div>
                
                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomPicker(false)}
                    className="flex-1 text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCustomDateChange}
                    className="flex-1 text-sm bg-smarthotels-gold hover:bg-yellow-600 text-white"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botón de Intervalos */}
        <div className="relative" ref={intervalPickerRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIntervalPicker(!showIntervalPicker)}
            className="text-sm px-4 py-2 h-10 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Intervalos
          </Button>
          
          {showIntervalPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-4 px-4 z-50 min-w-[320px]">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Configurar Intervalos de Gráficas</h3>
              
              <div className="space-y-4">
                {/* Opción Automático */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="auto"
                      name="interval"
                      value="auto"
                      checked={localCurrentInterval === 'auto'}
                      onChange={() => setLocalCurrentInterval('auto')}
                      className="text-smarthotels-gold focus:ring-smarthotels-gold"
                    />
                    <label htmlFor="auto" className="text-sm font-medium text-gray-700">
                      Automático
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">Calculado por el sistema</span>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-200"></div>

                {/* Opciones Personalizadas */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Personalizar:</h4>
                  
                  {/* Días */}
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="day"
                      name="interval"
                      value="day"
                      checked={localCurrentInterval.startsWith('day')}
                      onChange={() => setLocalCurrentInterval('day')}
                      className="text-smarthotels-gold focus:ring-smarthotels-gold"
                    />
                    <label htmlFor="day" className="text-sm font-medium text-gray-700 min-w-[60px]">
                      Días
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={localCurrentInterval.startsWith('day') ? localCurrentInterval.replace('day', '') || '1' : '1'}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value && parseInt(value) > 0) {
                          setLocalCurrentInterval(`day${value}`)
                        }
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-smarthotels-gold focus:border-smarthotels-gold"
                      disabled={!localCurrentInterval.startsWith('day')}
                    />
                  </div>

                  {/* Semanas */}
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="week"
                      name="interval"
                      value="week"
                      checked={localCurrentInterval.startsWith('week')}
                      onChange={() => setLocalCurrentInterval('week')}
                      className="text-smarthotels-gold focus:ring-smarthotels-gold"
                    />
                    <label htmlFor="week" className="text-sm font-medium text-gray-700 min-w-[60px]">
                      Semanas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={localCurrentInterval.startsWith('week') ? localCurrentInterval.replace('week', '') || '1' : '1'}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value && parseInt(value) > 0) {
                          setLocalCurrentInterval(`week${value}`)
                        }
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-smarthotels-gold focus:border-smarthotels-gold"
                      disabled={!localCurrentInterval.startsWith('week')}
                    />
                  </div>

                  {/* Meses */}
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="month"
                      name="interval"
                      value="month"
                      checked={localCurrentInterval.startsWith('month')}
                      onChange={() => setLocalCurrentInterval('month')}
                      className="text-smarthotels-gold focus:ring-smarthotels-gold"
                    />
                    <label htmlFor="month" className="text-sm font-medium text-gray-700 min-w-[60px]">
                      Meses
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={localCurrentInterval.startsWith('month') ? localCurrentInterval.replace('month', '') || '1' : '1'}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value && parseInt(value) > 0) {
                          setLocalCurrentInterval(`month${value}`)
                        }
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-smarthotels-gold focus:border-smarthotels-gold"
                      disabled={!localCurrentInterval.startsWith('month')}
                    />
                  </div>

                  {/* Años */}
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="year"
                      name="interval"
                      value="year"
                      checked={localCurrentInterval.startsWith('year')}
                      onChange={() => setLocalCurrentInterval('year')}
                      className="text-smarthotels-gold focus:ring-smarthotels-gold"
                    />
                    <label htmlFor="year" className="text-sm font-medium text-gray-700 min-w-[60px]">
                      Años
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={localCurrentInterval.startsWith('year') ? localCurrentInterval.replace('year', '') || '1' : '1'}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value && parseInt(value) > 0) {
                          setLocalCurrentInterval(`year${value}`)
                        }
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-smarthotels-gold focus:border-smarthotels-gold"
                      disabled={!localCurrentInterval.startsWith('year')}
                    />
                  </div>
                </div>

                {/* Botón de Aplicar */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleIntervalChange(localCurrentInterval)
                    }}
                    className="w-full text-sm bg-smarthotels-gold hover:bg-yellow-600 text-white"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botón Actualizar */}
        <Button
          onClick={handleRefresh}
          disabled={loading}
          size="sm"
          className="bg-smarthotels-gold hover:bg-yellow-600 text-white px-4 py-2 h-10 transform transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>

        {/* Rango de fechas */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg whitespace-nowrap overflow-hidden">
          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium truncate">
            {formatPeriod(safeDateRange.from, safeDateRange.to)}
          </span>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600 flex-shrink-0">
            {Math.ceil((safeDateRange.to.getTime() - safeDateRange.from.getTime()) / (1000 * 60 * 60 * 24))} días
          </span>
        </div>

        {/* Intervalo actual */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 whitespace-nowrap overflow-hidden">
          <BarChart3 className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium text-blue-700 truncate">
            {getIntervalDisplayName(propCurrentInterval)}
          </span>
        </div>
      </div>
    </div>
  )
}
