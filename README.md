# 🏨 SmartHotels Dashboard - Sistema de Gestión Inteligente para Hoteles

## 📋 Descripción General

SmartHotels Dashboard es una aplicación web desarrollada en **Next.js 14** que conecta las bases de datos de directivos hoteleros con información sobre sus emails y las respuestas automatizadas con recomendaciones de cross-selling personalizadas que escribe una IA.

El sistema permite a cada hotel tener su propio dashboard personalizado con métricas en tiempo real sobre el rendimiento de su sistema de emails automatizados, incluyendo análisis de sentimiento, oportunidades de upselling, gestión de incidencias y cálculo de ahorros operativos.

## 🏗️ Arquitectura del Sistema

### Estructura de Archivos y Directorios

```
Smarthotels-dashboard/
├── app/                          # App Router de Next.js 14
│   ├── api/                      # API Routes del backend
│   │   └── ops/                  # Endpoint principal para datos operativos
│   │       └── route.ts          # API que consulta las BBDD de hoteles
│   ├── globals.css               # Estilos globales con Tailwind CSS
│   ├── layout.tsx                # Layout principal con SupabaseProvider
│   ├── login/                    # Página de autenticación
│   │   └── page.tsx              # Formulario de login con validación
│   └── page.tsx                  # Dashboard principal (página home)
├── components/                    # Componentes React reutilizables
│   ├── dashboard/                 # Componentes específicos del dashboard
│   │   ├── BarChart.tsx          # Gráfico de barras para métricas
│   │   ├── ChartCard.tsx         # Contenedor para gráficos
│   │   ├── DashboardSkeleton.tsx # Skeleton loading del dashboard
│   │   ├── DonutChart.tsx        # Gráfico circular para distribuciones
│   │   ├── DynamicBarChart.tsx   # Gráfico de barras dinámico
│   │   ├── FilterBar.tsx         # Barra de filtros de fechas
│   │   ├── Header.tsx            # Header principal del dashboard
│   │   ├── HeaderControls.tsx    # Controles del header
│   │   ├── KpiCard.tsx           # Tarjeta de métrica KPI
│   │   ├── LineChart.tsx         # Gráfico de líneas para tendencias
│   │   ├── ProfileMenu.tsx       # Menú de perfil del usuario
│   │   ├── QuickStatsCard.tsx    # Tarjeta de estadísticas rápidas
│   │   └── SavingsPanel.tsx      # Panel de cálculo de ahorros
│   ├── providers/                 # Proveedores de contexto
│   │   └── SupabaseProvider.tsx  # Contexto de autenticación Supabase
│   └── ui/                       # Componentes de UI base
│       ├── Button.tsx            # Botón reutilizable
│       ├── DateRangePicker.tsx   # Selector de rangos de fechas
│       ├── ParticlesBackground.tsx # Fondo animado de partículas
│       ├── ProfileImage.tsx      # Imagen de perfil del usuario
│       └── Toast.tsx             # Sistema de notificaciones
├── config/                        # Configuraciones del sistema
│   ├── hotels.json               # Configuración de conexiones a BBDD de hoteles
│   └── users.json                # Configuración de usuarios y permisos
├── hooks/                         # Custom hooks de React
│   ├── useClientTime.ts          # Hook para manejo de tiempo del cliente
│   ├── useRealDashboardData.ts   # Hook principal para datos del dashboard
│   ├── useSound.ts               # Hook para efectos de sonido
│   └── useToast.ts               # Hook para sistema de notificaciones
├── lib/                           # Utilidades y configuraciones
│   ├── chart-colors.ts           # Configuración de colores para gráficos
│   ├── database.ts               # Configuración de conexiones PostgreSQL
│   ├── date-utils.ts             # Utilidades para manejo de fechas
│   ├── hotel-config.ts           # Configuración de hoteles
│   ├── image-utils.ts            # Utilidades para manejo de imágenes
│   ├── supabase-admin.ts         # Cliente Supabase para operaciones admin
│   ├── supabase-simple.ts        # Cliente Supabase para operaciones cliente
│   ├── supabase.ts               # Configuración base de Supabase
│   ├── user-config.ts            # Configuración de usuarios
│   └── utils.ts                  # Utilidades generales
├── public/                        # Archivos estáticos
│   └── assets/                   # Recursos multimedia
│       ├── FX/                   # Efectos de sonido
│       ├── images/                # Imágenes del sistema
│       └── profiles/              # Imágenes de perfil de usuarios
├── package.json                   # Dependencias y scripts
├── tailwind.config.js            # Configuración de Tailwind CSS
├── tsconfig.json                 # Configuración de TypeScript
└── next.config.js                # Configuración de Next.js
```

## 🔐 Sistema de Autenticación y Usuarios

### Flujo de Autenticación

1. **Configuración de Usuarios**: Cada directivo hotelero se configura en `config/users.json` con:
   - Email y contraseña (generados en Supabase Auth)
   - ID del hotel asociado
   - Rol y permisos
   - Imagen de perfil

2. **Configuración de Hoteles**: Cada hotel se configura en `config/hotels.json` con:
   - Credenciales de Supabase
   - Configuración de PostgreSQL
   - Parámetros de conexión

3. **Proceso de Login**:
   - Usuario ingresa email/contraseña en `/login`
   - Supabase valida las credenciales
   - Se obtiene el `hotel_id` del usuario
   - Se redirige al dashboard principal

### Estructura de Usuarios

```json
{
  "users": {
    "admin@hotel-madrid.es": {
      "id": "madrid_admin",
      "name": "Admin Madrid",
      "full_name": "Administrador Hotel Madrid",
      "hotel_id": "madrid",
      "role": "admin",
      "status": "active",
      "profileImage": "madrid_admin.png"
    }
  }
}
```

### Estructura de Hoteles

```json
{
  "hotels": {
    "madrid": {
      "name": "Hotel Madrid",
      "supabase": {
        "url": "https://hotel-madrid.supabase.co",
        "anon_key": "CLAVE_ANONIMA"
      },
      "postgres": {
        "host": "hotel-madrid.tuempresa.com",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "password-madrid-123",
        "ssl": false
      }
    }
  }
}
```

## 🗄️ Base de Datos y API

### Conexión Multi-Tenant

El sistema utiliza una arquitectura **multi-tenant** donde cada hotel tiene su propia base de datos PostgreSQL:

- **`lib/database.ts`**: Maneja conexiones dinámicas a PostgreSQL
- **`lib/hotel-config.ts`**: Obtiene configuración específica del hotel
- **`lib/user-config.ts`**: Gestiona configuración de usuarios

### API Principal (`/api/ops`)

El endpoint principal `/api/ops` consulta la base de datos del hotel del usuario autenticado:

1. **Autenticación**: Valida el token JWT de Supabase
2. **Identificación del Hotel**: Obtiene el `hotel_id` del usuario
3. **Consultas SQL**: Ejecuta queries específicos del hotel
4. **Procesamiento de Datos**: Transforma resultados en formato para el frontend

### Estructura de Datos de la API

La API devuelve un objeto completo con:

- **KPIs Principales**: Total emails, tiempo respuesta, SLA, upselling revenue
- **Datos de Gráficos**: Volumen, sentimiento, idiomas, categorías
- **Métricas de Upselling**: Ofertas enviadas, conversiones, revenue
- **Gestión de Incidencias**: Total, tiempos de gestión, categorías

## 📊 Dashboard y Visualización

### Componentes Principales

1. **`app/page.tsx`**: Dashboard principal que integra todos los componentes
2. **`hooks/useRealDashboardData.ts`**: Hook que gestiona la obtención y procesamiento de datos
3. **Componentes de Gráficos**: BarChart, LineChart, DonutChart para diferentes visualizaciones

### Secciones del Dashboard

1. **Resumen General**: KPIs principales con variaciones porcentuales
2. **Customer Experience**: Análisis de sentimiento, idiomas, categorías
3. **Rendimiento IA**: Volumen automático vs manual, distribución SLA
4. **Upselling**: Ofertas enviadas, conversiones, revenue generado
5. **Gestión de Incidencias**: Estadísticas y evolución temporal

### Sistema de Fechas Inteligente

El dashboard implementa un sistema de intervalos dinámicos que se adapta al rango de fechas seleccionado:

- **≤ 7 días**: Intervalos de 1 día
- **≤ 31 días**: Intervalos de 1 semana  
- **≤ 90 días**: Intervalos de 1 mes
- **≤ 365 días**: Intervalos de 1 mes
- **> 365 días**: Intervalos de 1 trimestre

## 🎨 Interfaz de Usuario

### Tecnologías de UI

- **Tailwind CSS**: Framework de utilidades para estilos
- **Recharts**: Biblioteca de gráficos para React
- **Lucide React**: Iconos modernos y consistentes
- **Particles Background**: Fondo animado con partículas doradas

### Características de UX

- **Responsive Design**: Adaptable a todos los dispositivos
- **Skeleton Loading**: Estados de carga elegantes
- **Efectos de Sonido**: Feedback auditivo para interacciones
- **Sistema de Notificaciones**: Toast notifications para feedback
- **Temas de Color**: Paleta personalizada con colores de marca

### Componentes Reutilizables

- **KpiCard**: Tarjetas de métricas con variaciones
- **ChartCard**: Contenedores para gráficos con títulos y subtítulos
- **Button**: Botones con variantes y estados
- **DateRangePicker**: Selector de rangos de fechas personalizable

## 🔧 Configuración y Despliegue

### Dependencias Principales

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.38.4",
    "next": "14.0.4",
    "pg": "^8.11.3",
    "react": "^18",
    "recharts": "^2.8.0",
    "swr": "^2.2.4"
  }
}
```

### Variables de Entorno

El sistema requiere configuración de:

- **Supabase**: URL y claves de API
- **PostgreSQL**: Credenciales de cada hotel
- **Autenticación**: Configuración de usuarios y roles

### Scripts Disponibles

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Verificación de código
npm run lint:fix     # Corrección automática de linting
npm run format       # Formateo de código con Prettier
npm run setup        # Instalación y configuración inicial
```

## 🚀 Flujo de Funcionamiento

### 1. Inicialización del Sistema

1. Usuario accede a la aplicación
2. Se carga el `SupabaseProvider` en el layout
3. Se verifica el estado de autenticación
4. Si no hay sesión, se redirige a `/login`

### 2. Proceso de Autenticación

1. Usuario ingresa credenciales en `/login`
2. Supabase valida email/contraseña
3. Se obtiene el `hotel_id` del usuario
4. Se redirige al dashboard principal

### 3. Carga del Dashboard

1. Se ejecuta `useRealDashboardData` hook
2. Se obtiene el rango de fechas por defecto
3. Se hace llamada a `/api/ops` con parámetros
4. Se procesan y transforman los datos
5. Se renderizan los componentes con datos reales

### 4. Consultas a Base de Datos

1. API recibe request con token de autenticación
2. Se valida el token y se obtiene el usuario
3. Se identifica el hotel del usuario
4. Se establece conexión a PostgreSQL del hotel
5. Se ejecutan queries SQL específicas
6. Se procesan y formatean los resultados
7. Se devuelven datos al frontend

### 5. Actualización en Tiempo Real

1. Usuario puede cambiar rangos de fechas
2. Se recalculan métricas y comparaciones
3. Se actualizan gráficos y KPIs
4. Se mantiene estado de loading y errores

## 🔒 Seguridad y Autenticación

### Capas de Seguridad

1. **Autenticación Supabase**: JWT tokens seguros
2. **Validación de Usuario**: Verificación de permisos por hotel
3. **Conexiones de BD**: Credenciales específicas por hotel
4. **API Protection**: Middleware de autenticación en endpoints

### Gestión de Sesiones

- Tokens JWT con expiración automática
- Refresh automático de sesiones
- Logout seguro con limpieza de estado
- Protección de rutas por autenticación

## 📈 Métricas y KPIs

### Indicadores Principales

1. **Volumen de Emails**: Total procesados en el período
2. **Tiempo de Respuesta**: Promedio de respuesta automática
3. **SLA 10min**: Porcentaje de emails respondidos en <10 minutos
4. **Upselling Revenue**: Ingresos generados por cross-selling
5. **Ahorro en Personal**: Cálculo de costes ahorrados por automatización
6. **Intervención Manual**: Porcentaje de emails que requieren supervisión

### Análisis de Sentimiento

- Clasificación automática de emails por sentimiento
- Distribución por categorías emocionales
- Seguimiento de tendencias temporales

### Gestión de Incidencias

- Total de incidencias por período
- Tiempos de gestión y resolución
- Categorización por tipo de problema
- Métricas de satisfacción del cliente

## 🎯 Características Avanzadas

### Sistema de Sonidos

- Efectos de sonido para interacciones
- Sonido de éxito al cargar datos
- Feedback auditivo para mejor UX

### Fondo de Partículas

- Animación de partículas doradas
- Efecto visual atractivo
- Configuración personalizable

### Cálculo de Ahorros

- Configuración de parámetros por hotel
- Cálculo en tiempo real de ahorros
- Métricas de ROI de la automatización

### Filtros Dinámicos

- Selección de rangos de fechas
- Comparación automática con períodos anteriores
- Cálculo de variaciones porcentuales

## 🔄 Flujo de Datos Completo

```
Usuario → Login → Supabase Auth → Dashboard → useRealDashboardData → API /api/ops → 
PostgreSQL Hotel → Procesamiento → Transformación → Componentes React → Gráficos y KPIs
```

## 📝 Notas de Desarrollo

### Estructura de Datos

- **TypeScript**: Tipado completo para mejor mantenibilidad
- **Interfaces**: Definiciones claras de estructuras de datos
- **Error Handling**: Manejo robusto de errores en todas las capas

### Performance

- **SWR**: Caching inteligente de datos
- **Lazy Loading**: Carga diferida de componentes pesados
- **Optimización de Queries**: Consultas SQL optimizadas por hotel

### Escalabilidad

- **Multi-tenant**: Soporte para múltiples hoteles
- **Configuración Dinámica**: Hoteles se añaden sin modificar código
- **Separación de Datos**: Cada hotel tiene su propia base de datos

## 🚀 Próximos Pasos y Mejoras

### Funcionalidades Planificadas

1. **Dashboard en Tiempo Real**: WebSockets para actualizaciones live
2. **Exportación de Datos**: PDF y Excel reports
3. **Alertas Automáticas**: Notificaciones por email/SMS
4. **Móvil App**: Aplicación nativa para iOS/Android
5. **Integración con PMS**: Conexión directa con sistemas de gestión hotelera

### Optimizaciones Técnicas

1. **Caching Avanzado**: Redis para datos frecuentemente consultados
2. **CDN**: Distribución global de assets estáticos
3. **Monitoring**: APM y logging avanzado
4. **Testing**: Suite completa de tests automatizados

---

## 📞 Soporte y Contacto

- **Email**: contact@smarthotels.es
- **Documentación**: Este README y comentarios en código
- **Issues**: Sistema de tickets para reportar problemas

---

*SmartHotels Dashboard - Transformando la gestión hotelera con IA y automatización inteligente* 🏨✨
