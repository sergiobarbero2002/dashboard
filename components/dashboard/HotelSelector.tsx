'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { getHotelInfo } from '@/lib/hotel-config'

interface HotelSelectorProps {
  className?: string
}

export default function HotelSelector({ className = '' }: HotelSelectorProps) {
  const { hotels, selectedHotels, updateSelectedHotels } = useSupabase()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleHotelToggle = (hotelId: string) => {
    if (selectedHotels.length === 1 && selectedHotels.includes(hotelId)) {
      return // No permitir deseleccionar si solo hay uno seleccionado
    }
    
    if (selectedHotels.includes(hotelId)) {
      updateSelectedHotels(selectedHotels.filter(id => id !== hotelId))
    } else {
      updateSelectedHotels([...selectedHotels, hotelId])
    }
  }

  const handleSelectAll = () => {
    updateSelectedHotels(hotels)
  }

  const getDisplayText = () => {
    if (selectedHotels.length === 0) return 'Sin hoteles'
    if (selectedHotels.length === hotels.length) return 'Todos los hoteles'
    if (selectedHotels.length === 1) {
      const hotelInfo = getHotelInfo('test', selectedHotels[0]) // Asumiendo que todos los hoteles están en el grupo 'test'
      return hotelInfo ? hotelInfo.name : selectedHotels[0]
    }
    return `${selectedHotels.length} hoteles seleccionados`
  }

  const getHotelDisplayName = (hotelId: string) => {
    const hotelInfo = getHotelInfo('test', hotelId) // Asumiendo que todos los hoteles están en el grupo 'test'
    return hotelInfo ? hotelInfo.name : hotelId
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <div className="relative group">
          {/* Círculo dorado de fondo para el icono de hotel */}
          <div className="w-8 h-8 bg-gradient-to-br from-smarthotels-gold via-yellow-500 to-yellow-600 rounded-full shadow-lg border-2 border-yellow-300 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
            {/* Icono de hotel centrado */}
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          {/* Brillo sutil en la parte superior */}
          <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-white/40 rounded-full blur-sm"></div>
        </div>
        <span className="text-sm font-medium text-gray-700">{getDisplayText()}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Seleccionar Hoteles</h3>
              <button
                onClick={handleSelectAll}
                className="text-xs text-smarthotels-gold hover:text-yellow-700 font-medium"
              >
                Seleccionar todos
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {hotels.map((hotelId) => {
                const hotelInfo = getHotelInfo('test', hotelId)
                const isSelected = selectedHotels.includes(hotelId)
                
                return (
                  <label key={hotelId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleHotelToggle(hotelId)}
                      className="w-4 h-4 text-smarthotels-gold border-gray-300 rounded focus:ring-smarthotels-gold"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {getHotelDisplayName(hotelId)}
                      </div>
                      {hotelInfo && (
                        <div className="text-xs text-gray-500">
                          {hotelInfo.stars}⭐ • {hotelInfo.rooms} habitaciones • {hotelInfo.location}
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
