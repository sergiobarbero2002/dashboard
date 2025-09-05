'use client'

import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface DynamicBarChartProps {
  data: Array<{ 
    name: string; 
    value: number; 
    intervalType?: string; 
    intervalName?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: any 
  }>
  title?: string
  height?: number
  xAxisLabel?: string
  yAxisLabel?: string
  showDetailedTooltip?: boolean
  infoContent?: string
  infoTitle?: string
}

export const DynamicBarChart: React.FC<DynamicBarChartProps> = ({
  data,
  title,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  showDetailedTooltip = false,
  infoContent,
  infoTitle
}) => {
  // Función para generar color basado en el valor (verde oscuro para mayor, rojo oscuro para menor)
  const getColorByValue = (value: number, allValues: number[]) => {
    if (allValues.length === 0) return '#6B7280'
    
    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues)
    
    if (maxValue === minValue) return '#059669' // Verde oscuro si todos los valores son iguales
    
    // Normalizar el valor entre 0 y 1
    const normalizedValue = (value - minValue) / (maxValue - minValue)
    
    // Paleta de colores profesional: verde oscuro → verde → amarillo → naranja → rojo oscuro
    if (normalizedValue >= 0.8) {
      return '#059669' // Verde oscuro (top performer)
    } else if (normalizedValue >= 0.6) {
      return '#10B981' // Verde normal
    } else if (normalizedValue >= 0.4) {
      return '#F59E0B' // Amarillo
    } else if (normalizedValue >= 0.2) {
      return '#F97316' // Naranja
    } else {
      return '#DC2626' // Rojo oscuro (low performer)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentData = data.find(item => item.name === label)
      
      return (
        <div className="bg-white p-4 border-2 border-smarthotels-gold rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800 mb-3 text-center border-b-2 border-smarthotels-gold pb-2">{label}</p>
                     {payload.map((entry: any, index: number) => (
             <p key={index} style={{ color: entry.color }} className="font-semibold text-base mb-1">
               {entry.value}€
             </p>
           ))}
          
          {showDetailedTooltip && currentData && (
            <div className="mt-3 pt-3 border-t-2 border-smarthotels-gold/30 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
                📊 Detalles del Período
              </p>
              <div className="space-y-1">
                {currentData.intervalType && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-smarthotels-gold">⏱️</span>
                    <span className="font-medium">Tipo:</span> 
                    {currentData.intervalType === 'day' ? 'Día completo' : 
                     currentData.intervalType === 'week' ? 'Semana completa' :
                     currentData.intervalType === 'month' ? 'Mes completo' :
                     currentData.intervalType === 'quarter' ? 'Trimestre completo' : 'Período'}
                  </p>
                )}
                {currentData.startDate && currentData.endDate && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-smarthotels-gold">🗓️</span>
                    <span className="font-medium">Fechas:</span> {currentData.startDate} a {currentData.endDate}
                  </p>
                )}

              </div>
            </div>
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

  // Obtener todos los valores para calcular colores
  const allValues = data.map(item => item.value)
  
  // Calcular colores para cada barra
  const barColors = data.map(item => {
    const color = getColorByValue(item.value, allValues)
    return color
  })

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
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 11 }}
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
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={barColors[index]}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
