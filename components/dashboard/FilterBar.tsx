'use client'

import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Calendar, Clock } from 'lucide-react'
import { getLastMonthRange, getLastQuarterRange } from '@/lib/date-utils'

interface FilterBarProps {
  dateRange: { from: Date; to: Date }
  onDateChange: (from: Date, to: Date) => void
  onRefresh: () => void
  loading: boolean
  lastUpdated: Date
}

export function FilterBar({ dateRange, onDateChange, onRefresh, loading, lastUpdated }: FilterBarProps) {
  const handleQuickDate = (preset: string) => {
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
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Selector de fechas */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Rango de Fechas</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onDateChange={onDateChange}
            />
            
            {/* Botones de acceso rápido */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate('last-week')}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Última semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate('last-month')}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Último mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate('last-quarter')}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Último trimestre
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate('last-year')}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Último año
              </Button>
            </div>
          </div>
        </div>

        {/* Botón de actualizar y estado */}
        <div className="flex flex-col items-end gap-3">
          <Button
            onClick={onRefresh}
            disabled={loading}
            className="bg-smarthotels-gold hover:bg-yellow-600 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Última actualización:</span>
            <span className="font-medium">
              {lastUpdated.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
      
      {/* Información del rango seleccionado */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando datos del{' '}
            <span className="font-medium">
              {dateRange.from.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </span>
            {' '}al{' '}
            <span className="font-medium">
              {dateRange.to.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </span>
          
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} días
          </span>
        </div>
      </div>
    </div>
  )
}
