// Configuración de colores para todos los gráficos del dashboard
// Colores consistentes y semánticos para cada tipo de dato

export const CHART_COLORS = {
  // 🎭 SENTIMIENTOS - Colores que transmiten emociones
  sentiment: {
    'Muy Positivo': '#0F5132',      // Verde muy oscuro - excelente
    'Positivo': '#198754',          // Verde claro - bueno
    'Medio': '#FFC107',           // Amarillo - neutral
    'Negativo': '#FD7E14',          // Naranja - malo
    'Muy Negativo': '#DC3545',      // Rojo - muy malo
  },

  // 🌍 IDIOMAS - Colores diversos y atractivos
  language: {
    'Español': '#3498DB',           // Azul - español
    'Inglés': '#E74C3C',            // Rojo - inglés
    'Francés': '#9B59B6',           // Púrpura - francés
    'Alemán': '#F39C12',            // Naranja - alemán
    'Italiano': '#1ABC9C',          // Verde azulado - italiano
    'Portugués': '#E67E22',         // Naranja oscuro - portugués
    'Ruso': '#34495E',              // Azul oscuro - ruso
    'Chino': '#E74C3C',             // Rojo - chino
    'Japonés': '#95A5A6',           // Gris - japonés
    'Otros': '#6C757D'              // Gris - otros idiomas
  },

  // 📂 CATEGORÍAS - Colores por tipo de servicio
  category: {
    'Estancia': '#007BFF',          // Azul - confianza, reservas (pero se muestra como "Reservas")
    'Servicios': '#FD7E14',         // Naranja - servicios, atención
    'Reclamaciones': '#DC3545',     // Rojo - problemas, urgencia
    'Incidencia': '#E74C3C',        // Rojo - incidencias
    'FAQ': '#6F42C1',               // Púrpura - preguntas frecuentes
    'Eventos': '#20C997',           // Verde azulado - eventos
    'Operaciones': '#17A2B8',       // Azul - operaciones
    'Sin categoría': '#6C757D'      // Gris - neutral
  },

  // ⏰ SLA TRAMOS - Colores por tiempo de respuesta (gradiente verde a rojo)
  slaTram: {
    '<10min': '#0F5132',            // Verde muy oscuro - excelente (<10 min)
    '10min-1h': '#28A745',          // Verde - muy bueno (10min-1h)
    '1-4h': '#FFC107',              // Amarillo - bueno (1-4h)
    '4-24h': '#FD7E14',             // Naranja - regular (4-24h)
    '>24h': '#DC3545'               // Rojo - muy malo (>24h)
  },

  // 🚨 INCIDENCIAS - Colores por tipo de problema
  incidents: {
    'Problemas de habitación': '#E74C3C',    // Rojo - problemas serios
    'Objetos perdidos': '#F39C12',           // Naranja - objetos
    'Problemas de staff': '#C0392B',         // Rojo oscuro - personal
    'Problemas técnicos': '#8E44AD',         // Púrpura - técnicos
    'Otros servicios': '#D35400',            // Naranja oscuro - otros
    'Sin categoría': '#95A5A6'               // Gris - neutral
  },

  // 🔧 SUBCATEGORÍAS DE INCIDENCIAS - Colores específicos por tipo
  incidentSubcategories: {
    'Pérdida de objetos': '#F39C12',         // Naranja - objetos perdidos
    'Queja de instalaciones': '#E74C3C',     // Rojo - problemas de instalaciones
    'Queja de estancia': '#3498DB',          // Azul - problemas de estancia
    'Queja del personal': '#9B59B6',         // Púrpura - problemas de personal
    'Queja de otros servicios del hotel': '#2ECC71', // Verde - otros servicios
    'Sin subcategoría': '#95A5A6'            // Gris - neutral
  },

  // 💰 UPSELLING - Colores por estado
  upselling: {
    'Enviadas': '#007BFF',          // Azul - enviadas
    'Aceptadas': '#28A745',         // Verde - aceptadas
    'Rechazadas': '#DC3545',        // Rojo - rechazadas
    'Pendientes': '#FFC107'         // Amarillo - pendientes
  }
}

// Función helper para obtener colores de cualquier tipo
export const getChartColor = (type: keyof typeof CHART_COLORS, name: string): string => {
  const colorMap = CHART_COLORS[type] as Record<string, string>
  return colorMap[name] || '#6C757D'
}

// Función para obtener colores de sentimiento
export const getSentimentColor = (sentiment: string): string => {
  return getChartColor('sentiment', sentiment)
}

// Función para obtener colores de idioma
export const getLanguageColor = (language: string): string => {
  return getChartColor('language', language)
}

// Función para obtener colores de categoría
export const getCategoryColor = (category: string): string => {
  return getChartColor('category', category)
}

// Función para obtener colores de SLA
export const getSlaTramColor = (slaTram: string): string => {
  return getChartColor('slaTram', slaTram)
}

// Función para obtener colores de incidencias
export const getIncidentColor = (incident: string): string => {
  return getChartColor('incidents', incident)
}

// Función para obtener colores de subcategorías de incidencias
export const getIncidentSubcategoryColor = (subcategory: string): string => {
  return getChartColor('incidentSubcategories', subcategory)
}
