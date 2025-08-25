'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'
import { Calendar } from 'lucide-react'
import { DateRange } from '@/hooks/useRealDashboardData'
import { useSound } from '@/hooks/useSound'

interface DateRangePickerProps {
  dateRange: DateRange
  onDateChange: (from: Date, to: Date) => void
  className?: string
}

export function DateRangePicker({ dateRange, onDateChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFrom, setLocalFrom] = useState(dateRange?.from || new Date())
  const [localTo, setLocalTo] = useState(dateRange?.to || new Date())
  const { playClick } = useSound()

  // Actualizar el estado local cuando cambie dateRange
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setLocalFrom(dateRange.from)
      setLocalTo(dateRange.to)
    }
  }, [dateRange])

  const handleButtonClick = () => {
    // Abrir directamente el selector de fechas personalizadas
    setIsOpen(!isOpen)
  }

  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    const date = new Date(value)
    if (field === 'from') {
      setLocalFrom(date)
    } else {
      setLocalTo(date)
    }
  }

  const handleApply = () => {
    playClick()
    onDateChange(localFrom, localTo)
    setIsOpen(false)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className={`relative ${className || ''}`}>
      <Button
        variant="outline"
        onClick={handleButtonClick}
        className="min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(localFrom)} - {formatDate(localTo)}</span>
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Seleccionar fechas personalizadas</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={localFrom.toISOString().split('T')[0]}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={localTo.toISOString().split('T')[0]}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                className="w-full"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
