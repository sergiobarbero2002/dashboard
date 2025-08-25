'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, Save, Clock, Euro } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ChartCard } from './ChartCard'

interface SavingsPanelProps {
  emailsManaged: number
  onAssumptionsChange: (assumptions: SavingsAssumptions) => void
}

export interface SavingsAssumptions {
  minutesPerEmail: number
  hourlyRate: number
}

const DEFAULT_ASSUMPTIONS: SavingsAssumptions = {
  minutesPerEmail: 7,
  hourlyRate: 15
}

export const SavingsPanel: React.FC<SavingsPanelProps> = ({
  emailsManaged,
  onAssumptionsChange
}) => {
  const [assumptions, setAssumptions] = useState<SavingsAssumptions>(DEFAULT_ASSUMPTIONS)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    onAssumptionsChange(assumptions)
  }, [assumptions, onAssumptionsChange])

  const handleSave = () => {
    setIsEditing(false)
    onAssumptionsChange(assumptions)
  }

  const handleCancel = () => {
    setAssumptions(DEFAULT_ASSUMPTIONS)
    setIsEditing(false)
  }

  const hoursSaved = (emailsManaged * assumptions.minutesPerEmail) / 60
  const eurosSaved = hoursSaved * assumptions.hourlyRate

  return (
    <ChartCard
      title="Supuestos de Ahorro"
      subtitle="Configura los parámetros para calcular el ahorro operativo"
      className="lg:col-span-1"
      actions={
        isEditing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} variant="primary">
              Guardar
            </Button>
            <Button size="sm" onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setIsEditing(true)} variant="outline">
            Editar
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minutos por email (baseline)
              </label>
              <input
                type="number"
                value={assumptions.minutesPerEmail}
                onChange={(e) => setAssumptions(prev => ({
                  ...prev,
                  minutesPerEmail: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold"
                min="0"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario €/hora
              </label>
              <input
                type="number"
                value={assumptions.hourlyRate}
                onChange={(e) => setAssumptions(prev => ({
                  ...prev,
                  hourlyRate: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-smarthotels-gold"
                min="0"
                step="0.5"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-smarthotels-gold" />
                <span className="text-sm font-medium text-gray-700">Minutos por email:</span>
              </div>
              <span className="font-semibold text-gray-900">{assumptions.minutesPerEmail} min</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-smarthotels-gold" />
                <span className="text-sm font-medium text-gray-700">Salario por hora:</span>
              </div>
              <span className="font-semibold text-gray-900">{assumptions.hourlyRate} €</span>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Resultados del período</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-smarthotels-gold-light rounded-lg">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-smarthotels-gold-dark" />
                <span className="text-sm font-medium text-gray-700">Emails gestionados por IA:</span>
              </div>
              <span className="font-bold text-gray-900">{emailsManaged.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-smarthotels-gold-light rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-smarthotels-gold-dark" />
                <span className="text-sm font-medium text-gray-700">Horas ahorradas:</span>
              </div>
              <span className="font-bold text-gray-900">{hoursSaved.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-smarthotels-gold-light rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-smarthotels-gold-dark" />
                <span className="text-sm font-medium text-gray-700">€ ahorrados:</span>
              </div>
              <span className="font-bold text-gray-900">{eurosSaved.toFixed(0)} €</span>
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  )
}
