'use client'

import React, { useState } from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  content: string
  title?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  position = 'top',
  className = '',
  size = 'sm'
}) => {
  const [isVisible, setIsVisible] = useState(false)

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'md':
        return 'w-5 h-5'
      case 'lg':
        return 'w-6 h-6'
      default:
        return 'w-4 h-4'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
    }
  }

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-amber-200'
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-amber-200'
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-amber-200'
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-amber-200'
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-amber-200'
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Icono de información */}
      <button
        type="button"
        className={`${getSizeClasses()} text-amber-500 hover:text-amber-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-opacity-50 rounded-full`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label="Información adicional"
      >
        <Info className="w-full h-full" />
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div className={`absolute z-50 ${getPositionClasses()}`}>
          <div className="bg-white border-2 border-amber-200 rounded-lg shadow-2xl p-4 max-w-md w-80">
            {/* Flecha del tooltip */}
            <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} />
            
            {/* Contenido del tooltip */}
            <div className="relative">
              {title && (
                <h4 className="font-bold text-amber-800 text-sm mb-2 border-b border-amber-200 pb-2">
                  {title}
                </h4>
              )}
              <p className="text-gray-700 text-sm leading-relaxed">
                {content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
