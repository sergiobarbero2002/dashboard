/**
 * Utilidades para manejo inteligente de fechas en gráficas
 */

export interface DateRange {
  from: Date
  to: Date
}

/**
 * Genera fechas equiespaciadas inteligentemente basadas en el rango
 */
export function generateIntelligentDates(range: DateRange, maxPoints: number = 7): Date[] {
  const totalDays = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
  
  // Determinar el tipo de agrupación basado en el rango total
  let interval: 'day' | 'week' | 'month' | 'quarter' = 'day'
  let intervalDays = 1
  
  if (totalDays <= 7) {
    interval = 'day'
    intervalDays = 1
  } else if (totalDays <= 30) {
    interval = 'week'
    intervalDays = 7
  } else if (totalDays <= 90) {
    interval = 'month'
    intervalDays = 30
  } else if (totalDays <= 365) {
    interval = 'quarter'
    intervalDays = 90
  } else {
    interval = 'month'
    intervalDays = 30
  }
  
  // Calcular cuántos puntos necesitamos
  const points = Math.min(maxPoints, Math.ceil(totalDays / intervalDays))
  
  const dates: Date[] = []
  const currentDate = new Date(range.from)
  
  for (let i = 0; i < points; i++) {
    dates.push(new Date(currentDate))
    
    // Avanzar al siguiente intervalo
    if (interval === 'day') {
      currentDate.setDate(currentDate.getDate() + intervalDays)
    } else if (interval === 'week') {
      currentDate.setDate(currentDate.getDate() + intervalDays)
    } else if (interval === 'month') {
      currentDate.setMonth(currentDate.getMonth() + 1)
    } else if (interval === 'quarter') {
      currentDate.setMonth(currentDate.getMonth() + 3)
    }
  }
  
  return dates
}

/**
 * Genera fechas semanales equiespaciadas
 */
function generateWeeklyDates(from: Date, to: Date, maxPoints: number): Date[] {
  const dates: Date[] = []
  const totalWeeks = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 7))
  const step = Math.max(1, Math.floor(totalWeeks / maxPoints))
  
  for (let i = 0; i < maxPoints && i * step < totalWeeks; i++) {
    const date = new Date(from)
    date.setDate(date.getDate() + (i * step * 7))
    dates.push(date)
  }
  
  return dates
}

/**
 * Genera fechas diarias espaciadas inteligentemente
 */
function generateSpacedDailyDates(from: Date, to: Date, maxPoints: number): Date[] {
  const dates: Date[] = []
  const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  const step = Math.max(1, Math.floor(totalDays / maxPoints))
  
  for (let i = 0; i < maxPoints && i * step < totalDays; i++) {
    const date = new Date(from)
    date.setDate(date.getDate() + (i * step))
    dates.push(date)
  }
  
  return dates
}

/**
 * Formatea una fecha para mostrar en gráficas
 */
export function formatChartDate(date: Date, range: DateRange): string {
  const totalDays = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
  
  if (totalDays <= 7) {
    // Para rangos cortos, mostrar día y mes
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  } else if (totalDays <= 30) {
    // Para rangos medianos, mostrar día
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit'
    })
  } else {
    // Para rangos largos, mostrar mes
    return date.toLocaleDateString('es-ES', { 
      month: 'short'
    })
  }
}

/**
 * Genera etiquetas de fechas para el eje X de las gráficas
 */
export function generateChartLabels(range: DateRange, maxLabels: number = 7): string[] {
  const dates = generateIntelligentDates(range, maxLabels)
  return dates.map(date => formatChartDate(date, range))
}

/**
 * Calcula el rango de fechas por defecto (últimos 7 días)
 */
export function getDefaultDateRange(): DateRange {
  const now = new Date()
  const from = new Date(now)
  from.setMonth(now.getMonth() - 1) // Cambiar de setDate(now.getDate() - 7) a setMonth(now.getMonth() - 1)
  
  return {
    from,
    to: now
  }
}

/**
 * Calcula el rango de fechas para el último mes
 */
export function getLastMonthRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - 1)
  return { from, to }
}

/**
 * Calcula el rango de fechas para el último trimestre
 */
export function getLastQuarterRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - 3)
  return { from, to }
}

/**
 * Obtiene un rango de fechas predefinido
 */
export function getDateRangePreset(preset: string): DateRange {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  switch (preset) {
    case 'last-day':
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      return {
        from: yesterday,
        to: now
      }
    
    case 'last-week':
      const lastWeek = new Date(now)
      lastWeek.setDate(now.getDate() - 7)
      return {
        from: lastWeek,
        to: now
      }
    
    case 'last-month':
      const lastMonth = new Date(now)
      lastMonth.setMonth(now.getMonth() - 1)
      return {
        from: lastMonth,
        to: now
      }
    
    case 'last-quarter':
      const lastQuarter = new Date(now)
      lastQuarter.setMonth(now.getMonth() - 3)
      return {
        from: lastQuarter,
        to: now
      }
    
    case 'last-semester':
      const lastSemester = new Date(now)
      lastSemester.setMonth(now.getMonth() - 6)
      return {
        from: lastSemester,
        to: now
      }
    
    case 'last-year':
      const lastYear = new Date(now)
      lastYear.setFullYear(now.getFullYear() - 1)
      return {
        from: lastYear,
        to: now
      }
    
    case 'since-always':
      // Desde hace 10 años (o desde el inicio de tu negocio)
      const sinceAlways = new Date(now)
      sinceAlways.setFullYear(now.getFullYear() - 10)
      return {
        from: sinceAlways,
        to: now
      }
    
    case 'month':
      return {
        from: new Date(currentYear, currentMonth, 1),
        to: new Date(currentYear, currentMonth + 1, 0)
      }
    
    case 'quarter':
      const quarter = Math.floor(currentMonth / 3)
      const quarterStartMonth = quarter * 3
      return {
        from: new Date(currentYear, quarterStartMonth, 1),
        to: new Date(currentYear, quarterStartMonth + 3, 0)
      }
    
    case 'year':
      return {
        from: new Date(currentYear, 0, 1),
        to: new Date(currentYear, 11, 31)
      }
    
    default:
      // Últimos 30 días por defecto
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)
      return {
        from: thirtyDaysAgo,
        to: now
      }
  }
}

/**
 * Formatea una fecha para mostrar en la UI
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea un rango de fechas para mostrar en la UI
 */
export function formatDateRange(from: Date, to: Date): string {
  return `${formatDate(from)} - ${formatDate(to)}`
}
