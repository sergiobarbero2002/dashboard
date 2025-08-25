'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SlaAreaChartProps {
  data: Array<{ name: string; value: number; color: string }>
  height?: number
}

export const SlaAreaChart: React.FC<SlaAreaChartProps> = ({
  data,
  height = 300
}) => {
  // Crear datos para el gráfico de área simple (sin acumulación)
  const chartData = data.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: item.color
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            Valor: {payload[0].value}
          </p>
                  <p className="text-sm text-gray-600">
          Valor: {payload[0].value}
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
          <p className="text-lg font-medium">No hay datos de SLA disponibles</p>
          <p className="text-sm">Selecciona un rango de fechas diferente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Emails', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Gráfico de área principal */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            strokeWidth={2}
            fill="url(#gradient-0)"
            fillOpacity={0.8}
          />
          
          {/* Definir gradientes SVG para cada sección */}
          <defs>
            {data.map((item, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`gradient-${index}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0.3} />
              </linearGradient>
            ))}
          </defs>
          
          {/* Área individual para cada categoría SLA */}
          {data.map((item, index) => (
            <Area
              key={`area-${index}`}
              type="monotone"
              dataKey="value"
              stroke={item.color}
              strokeWidth={2}
              fill={`url(#gradient-${index})`}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Leyenda personalizada */}
      <div className="mt-4 flex justify-center gap-4 text-xs">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
