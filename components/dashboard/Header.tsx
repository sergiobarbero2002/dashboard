'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ProfileMenu } from './ProfileMenu'
import { HeaderControls } from './HeaderControls'
import HotelSelector from './HotelSelector'

interface HeaderProps {
  dateRange?: { from: Date; to: Date }
  onDateChange?: (from: Date, to: Date) => void
  onRefresh?: () => void
  onIntervalChange?: (interval: string) => void
  loading?: boolean
  lastUpdated?: Date
  currentInterval?: string
}

export function Header({ 
  dateRange, 
  onDateChange, 
  onRefresh, 
  onIntervalChange,
  loading, 
  lastUpdated,
  currentInterval
}: HeaderProps) {
  // Solo mostrar estado de carga si no hay funciones críticas
  if (!onDateChange && !onRefresh) {
    return (
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 p-4">
        <div className="flex items-center justify-between">
          {/* Logo de SmartHotels */}
          <div className="flex items-center">
            <div className="relative group">
              {/* Cuadrado elegante con bordes dorados y fondo blanco */}
              <div className="w-12 h-12 bg-white rounded-lg shadow-lg border-2 border-smarthotels-gold flex items-center justify-center transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                {/* Logo centrado */}
                <img
                  src="/assets/images/smarthotels-logo.png"
                  alt="SmartHotels Logo"
                  className="h-10 w-10 object-contain"
                />
              </div>
              {/* Brillo sutil en la esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-smarthotels-gold/30 rounded-tl-lg"></div>
            </div>
          </div>
          
          {/* Controles centrales - Estado de carga */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-4 text-gray-500">
              <div className="animate-pulse">Cargando controles...</div>
            </div>
          </div>
          
          {/* Menú de perfil */}
          <div className="flex items-center">
            <ProfileMenu />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 p-4">
      <div className="flex items-center justify-between">
        
        {/* Logo + Hoteles juntos a la izquierda */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            {/* Cuadrado elegante con bordes dorados y fondo blanco */}
            <div className="w-12 h-12 bg-white rounded-lg shadow-lg border-2 border-smarthotels-gold flex items-center justify-center transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
              {/* Logo centrado */}
              <img
                src="/assets/images/smarthotels-logo.png"
                alt="SmartHotels Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
            {/* Brillo sutil en la esquina superior izquierda */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-smarthotels-gold/30 rounded-tl-lg"></div>
          </div>
          <HotelSelector />
        </div>
        
        {/* Controles centrales - Solo fechas y refresh */}
        <HeaderControls
          dateRange={dateRange}
          onDateChange={onDateChange}
          onRefresh={onRefresh}
          onIntervalChange={onIntervalChange}
          loading={loading}
          lastUpdated={lastUpdated}
          currentInterval={currentInterval}
        />
        
        {/* Menú de perfil */}
        <div className="flex items-center">
          <ProfileMenu />
        </div>
        
      </div>
    </header>
  )
}
