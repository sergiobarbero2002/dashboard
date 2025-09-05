'use client'

import React from 'react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface LineChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>
  title?: string
  height?: number
  xAxisLabel?: string
  yAxisLabel?: string
  lines: Array<{ key: string; color: string; label: string }>
  showDetailedTooltip?: boolean
  infoContent?: string
  infoTitle?: string
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  lines,
  showDetailedTooltip = false,
  infoContent,
  infoTitle
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentData = data.find(item => item.name === label)
      
      return (
        <div className="bg-white p-4 border-2 border-smarthotels-gold rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800 mb-3 text-center border-b-2 border-smarthotels-gold pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="font-semibold text-base mb-1">
              {entry.name}: {entry.value}
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
                {/* Información específica según el tipo de gráfica */}
                {currentData.conversionRate !== undefined && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-smarthotels-gold">📊</span>
                    <span className="font-medium">Tasa Conversión:</span> {currentData.conversionRate}%
                  </p>
                )}
                
                {/* Tasa de Oferta */}
                {currentData.offersSent !== undefined && currentData.totalEmails && currentData.totalEmails > 0 && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-blue-500">📧</span>
                    <span className="font-medium">Tasa de Oferta:</span> {((currentData.offersSent / currentData.totalEmails) * 100).toFixed(1)}%
                  </p>
                )}

                {currentData.automatic !== undefined && currentData.total && currentData.total > 0 && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-smarthotels-gold">🤖</span>
                    <span className="font-medium">% Automático:</span> {((currentData.automatic / currentData.total) * 100).toFixed(1)}%
                  </p>
                )}
                {currentData.unanswered !== undefined && currentData.total && currentData.total > 0 && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-red-500">⚠️</span>
                    <span className="font-medium">% Sin Responder:</span> {((currentData.unanswered / currentData.total) * 100).toFixed(1)}%
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
        <RechartsLineChart
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
          <Legend />
          {lines.map((line, index) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
              name={line.label}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
