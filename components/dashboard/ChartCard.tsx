'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
  subtitle?: string
  actions?: React.ReactNode
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className,
  subtitle,
  actions
}) => {
  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}
