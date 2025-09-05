'use client'

import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getSlaTramColor } from '@/lib/chart-colors'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface BarChartProps {
  data: Array<{ name: string; value: number; count?: number; totalEmailsPeriod?: number; color?: string }>
  title?: string
  height?: number
  xAxisLabel?: string
  yAxisLabel?: string
  horizontal?: boolean
  infoContent?: string
  infoTitle?: string
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  horizontal = false,
  infoContent,
  infoTitle
}) => {

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentData = data.find(item => item.name === label)
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {currentData?.totalEmailsPeriod ? (
            <p className="text-smarthotels-gold font-semibold text-lg">
              {currentData.totalEmailsPeriod} emails ({payload[0].value}%)
            </p>
          ) : (
            <p className="text-smarthotels-gold font-semibold">
              {payload[0].value}%
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No hay datos disponibles</p>
          <p className="text-sm">Selecciona un rango de fechas diferente</p>
        </div>
      </div>
    )
  }

  // Mantener el orden original de los datos (no ordenar por valor)
  const chartData = [...data]

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <h4 className="text-center text-sm font-medium text-gray-600">{title}</h4>
          {infoContent && (
            <InfoTooltip
              content={infoContent}
              title={infoTitle}
              position="top"
              size="sm"
            />
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 11 }}
            angle={horizontal ? 0 : -45}
            textAnchor={horizontal ? 'middle' : 'end'}
            height={horizontal ? 60 : 80}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 11 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
            fill="#D4AF37"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getSlaTramColor(entry.name) || "#D4AF37"}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
