'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getSlaTramColor } from '@/lib/chart-colors'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface SlaDistributionChartProps {
  data: Array<{ name: string; value: number; totalEmailsPeriod: number; color: string }>
  title?: string
  height?: number
  infoContent?: string
  infoTitle?: string
}

export const SlaDistributionChart: React.FC<SlaDistributionChartProps> = ({
  data,
  title,
  height = 300,
  infoContent,
  infoTitle
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentData = data.find(item => item.name === label)
      if (currentData) {
        return (
          <div className="bg-white p-4 border-2 border-smarthotels-gold rounded-xl shadow-2xl">
            <p className="font-bold text-gray-800 mb-3 text-center border-b-2 border-smarthotels-gold pb-2">{label}</p>
            <div className="text-center">
              <p className="text-2xl font-bold text-smarthotels-gold mb-1">
                {currentData.totalEmailsPeriod} emails
              </p>
              <p className="text-xl font-semibold text-gray-600">
                ({currentData.value}%)
              </p>
            </div>
          </div>
        )
      }
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No hay datos disponibles</p>
          <p className="text-sm">Selecciona un rango de fechas diferente</p>
          <p className="text-xs mt-2">Debug: {JSON.stringify(data)}</p>
        </div>
      </div>
    )
  }

  // Mantener el orden original de los datos
  const chartData = [...data]

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 11 }}
            height={50}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 11 }}
            label={{ value: '%', angle: -90, position: 'insideLeft' }}
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
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
