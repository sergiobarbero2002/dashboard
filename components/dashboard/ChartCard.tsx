'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
  subtitle?: string
  actions?: React.ReactNode
  infoContent?: string
  infoTitle?: string
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className,
  subtitle,
  actions,
  infoContent,
  infoTitle
}) => {
  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {infoContent && (
              <InfoTooltip
                content={infoContent}
                title={infoTitle}
                position="top"
                size="sm"
              />
            )}
          </div>
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
