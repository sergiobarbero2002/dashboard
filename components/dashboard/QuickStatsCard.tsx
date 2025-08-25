'use client'

import { ReactNode } from 'react'

interface QuickStatsCardProps {
  value: string | number
  label: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function QuickStatsCard({ 
  value, 
  label, 
  icon, 
  trend, 
  className = '' 
}: QuickStatsCardProps) {
  return (
    <div className={`bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border-2 border-smarthotels-gold/30 shadow-sm hover:border-smarthotels-gold hover:shadow-smarthotels-gold-lg hover:scale-105 transition-all duration-300 ${className}`}>
      <div className="text-center">
        {icon && (
          <div className="flex justify-center mb-2">
            <div className="w-6 h-6 text-smarthotels-gold">
              {icon}
            </div>
          </div>
        )}
        <div className="text-2xl font-bold text-slate-900 mb-1">
          {value}
        </div>
        <div className="text-xs text-slate-700 uppercase tracking-wider mb-2">
          {label}
        </div>
        {trend && (
          <div className={`flex items-center justify-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <svg 
              className={`w-3 h-3 ${trend.isPositive ? 'rotate-0' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
