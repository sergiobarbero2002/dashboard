'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>
  title?: string
  height?: number
  startAngle?: number
  infoContent?: string
  infoTitle?: string
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  height = 300,
  startAngle = 90,
  infoContent,
  infoTitle
}) => {

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-smarthotels-gold font-semibold">
            {payload[0].value} ({((payload[0].value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
          </p>
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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            startAngle={startAngle}
            endAngle={startAngle + 360}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-sm text-gray-700">{entry.payload.name}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
