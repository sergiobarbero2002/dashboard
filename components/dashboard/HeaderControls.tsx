'use client'

import { Button } from '@/components/ui/Button'
import { RefreshCw, Calendar, Clock } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'

interface HeaderControlsProps {
  dateRange?: { from: Date; to: Date }
  onDateChange?: (from: Date, to: Date) => void
  onRefresh?: () => void
  loading?: boolean
  lastUpdated?: Date
}

export function HeaderControls({ 
  dateRange, 
  onDateChange, 
  onRefresh, 
  loading, 
  lastUpdated 
}: HeaderControlsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const { showSuccess, showError } = useToast()
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Valores por defecto para evitar errores cuando dateRange es undefined
  const safeDateRange = dateRange || {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
    to: new Date()
  }

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
        setShowCustomPicker(false)
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
    if (!onDateChange) return
    
    const now = new Date()
    let from: Date
    
    switch (preset) {
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
      default:
        from = new Date(now)
        from.setDate(now.getDate() - 7)
    }
    
    onDateChange(from, now)
    setShowDatePicker(false)
    setShowCustomPicker(false)
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
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
    showSuccess('Rango de fechas actualizado correctamente')
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
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[160px]">
              <button
                onClick={() => handleQuickDate('last-week')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Última semana
              </button>
              <button
                onClick={() => handleQuickDate('last-month')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Último mes
              </button>
              <button
                onClick={() => handleQuickDate('last-quarter')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Último trimestre
              </button>
              <button
                onClick={() => handleQuickDate('last-year')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Último año
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handlePersonalizado}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Personalizado
              </button>
            </div>
          )}

          {/* Interfaz directa para fechas personalizadas */}
          {showCustomPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-4 px-4 z-50 min-w-[280px]">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Seleccionar fechas personalizadas</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold text-sm"
                  />
                </div>
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
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="font-medium">
            {formatPeriod(safeDateRange.from, safeDateRange.to)}
          </span>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">
            {Math.ceil((safeDateRange.to.getTime() - safeDateRange.from.getTime()) / (1000 * 60 * 60 * 24))} días
          </span>
        </div>
      </div>
    </div>
  )
}
