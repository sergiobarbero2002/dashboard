'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  variation?: { percentage: number; isIncrease: boolean }
  status?: 'success' | 'warning' | 'danger' | 'neutral'
  className?: string
  icon?: React.ReactNode
  extraContent?: React.ReactNode
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  variation,
  status,
  className,
  icon,
  extraContent
}) => {
  const getVariationIcon = () => {
    if (!variation) return <Minus className="h-4 w-4 text-gray-400" />
    if (variation.isIncrease) return <TrendingUp className="h-4 w-4 text-green-500" />
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const getStatusClasses = () => {
    if (!status) return ''
    switch (status) {
      case 'success':
        return 'border-l-4 border-l-smarthotels-success'
      case 'warning':
        return 'border-l-4 border-l-smarthotels-warning'
      case 'danger':
        return 'border-l-4 border-l-smarthotels-danger'
      default:
        return ''
    }
  }

  return (
    <div className={cn(
      'kpi-card relative max-w-sm',
      getStatusClasses(),
      className
    )}>
      {extraContent && (
        <div className="absolute top-3 right-3 z-10">
          {extraContent}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-smarthotels-gold">{icon}</div>}
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {variation && (
              <div className="flex items-center gap-1 text-sm">
                {getVariationIcon()}
                <span className={cn(
                  'font-medium',
                  variation.isIncrease ? 'text-green-500' : 'text-red-500'
                )}>
                  {variation.percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis" title={subtitle}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
