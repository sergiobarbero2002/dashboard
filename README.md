# 🏨 SmartHotels Dashboard - Sistema de Seguridad y Arquitectura

## 📋 Tabla de Contenidos

1. [Descripción General](#-descripción-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Flujo de Seguridad Completo](#-flujo-de-seguridad-completo)
4. [Variables de Entorno](#-variables-de-entorno)
5. [Backend - API Routes](#-backend---api-routes)
6. [Frontend - Hooks y Componentes](#-frontend---hooks-y-componentes)
7. [Base de Datos](#-base-de-datos)
8. [Configuración de Usuarios y Hoteles](#-configuración-de-usuarios-y-hoteles)
9. [Instalación y Configuración](#-instalación-y-configuración)
10. [Deployment en Vercel](#-deployment-en-vercel)
11. [Troubleshooting](#-troubleshooting)

---

## 🎯 Descripción General

SmartHotels Dashboard es una aplicación web que permite a usuarios autenticados acceder a datos de hoteles específicos de forma segura. El sistema implementa una arquitectura de **seguridad por capas** donde:

- **Frontend**: Solo tiene acceso a datos de negocio seguros
- **Backend**: Maneja toda la lógica sensible y credenciales
- **Base de Datos**: Cada usuario accede solo a sus hoteles asignados

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    BACKEND      │    │   BASE DE       │
│   (Cliente)     │◄──►│   (Servidor)    │◄──►│   DATOS         │
│                 │    │                 │    │                 │
│ • React/Next.js │    │ • API Routes    │    │ • PostgreSQL    │
│ • Hooks         │    │ • Middleware    │    │ • Supabase      │
│ • Componentes   │    │ • Config        │    │ • Multi-tenant  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Principios de Seguridad:**

1. **Separación de Responsabilidades**: Frontend nunca ve credenciales
2. **Autenticación por Token**: JWT tokens para identificación
3. **Configuración Dinámica**: Usuarios se asignan a bases de datos específicas
4. **Filtrado de Datos**: Cada usuario solo ve sus hoteles asignados

---

## 🔐 Flujo de Seguridad Completo

### **PASO 1: Autenticación del Usuario**

```typescript
// Frontend: app/login/page.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'demo@smarthotels.es',
  password: 'demo123456'
})

// Resultado: Usuario autenticado con access_token
// El frontend NO tiene acceso a variables de entorno sensibles
```

**¿Qué sucede?**
- Usuario se autentica usando credenciales públicas de Supabase
- Se obtiene un `access_token` que identifica al usuario
- Solo se usan variables `NEXT_PUBLIC_*` (seguras para el cliente)

### **PASO 2: Frontend Solicita Datos al Backend**

```typescript
// Frontend: hooks/useRealDashboardData.ts
const response = await fetch(`/api/ops?from=${fromDate}&to=${toDate}`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`, // Token del usuario
    'Content-Type': 'application/json'
  }
})
```

**¿Qué sucede?**
- Frontend envía el token de autenticación
- NO sabe qué base de datos usar ni qué hoteles tiene asignados
- Solo pide datos genéricos al backend

### **PASO 3: Backend Verifica la Autenticación**

```typescript
// Backend: app/api/ops/route.ts
export async function GET(request: NextRequest) {
  // 1. Extraer token del header de autorización
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const token = authHeader.substring(7)
  
  // 2. Verificar token usando Supabase Admin (SOLO EN SERVIDOR)
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  // 3. Obtener información del usuario autenticado
  const userEmail = user.email // 'sergio@smarthotels.es'
  const tenantId = user.user_metadata?.tenant_id || 'test'
}
```

**¿Qué sucede?**
- Backend usa `SUPABASE_AUTH_SERVICE_ROLE_KEY` (variable privada del servidor)
- Verifica que el token sea válido y no haya expirado
- Obtiene la identidad completa del usuario autenticado

### **PASO 4: Backend Obtiene Configuración del Usuario**

```typescript
// Backend: lib/env-config.ts (SOLO SE EJECUTA EN SERVIDOR)
export async function getUserConfigFromServer(email: string): Promise<UserConfig | null> {
  // VALIDACIÓN DE SEGURIDAD: Solo ejecutar en servidor
  if (typeof window !== 'undefined') {
    throw new Error('getUserConfigFromServer solo puede ejecutarse en el servidor')
  }

  try {
    // Configuración hardcodeada (en producción sería desde BD o variables de entorno)
    const users: Record<string, UserConfig> = {
      'sergio@smarthotels.es': {
        id: 'sergio',
        name: 'Sergio',
        full_name: 'Sergio Barbero García',
        hotel_group: 'test',        // Grupo de hoteles asignado
        hotels: ['demo1', 'demo2', 'demo3'], // Hoteles específicos
        role: 'admin',
        status: 'active',
        profileImage: 'sergio.png'
      },
      'demo@smarthotels.es': {
        id: 'demo',
        name: 'Usuario Demo',
        full_name: 'Usuario Demo',
        hotel_group: 'test',
        hotels: ['demo1', 'demo2', 'demo3'],
        role: 'admin',
        status: 'active',
        profileImage: 'demo.png'
      }
    }

    return users[email] || null
  } catch (error) {
    console.error('Error getting user config:', error)
    return null
  }
}
```

**¿Qué sucede?**
- Backend accede a la configuración del usuario autenticado
- **NUNCA** se envía esta información al frontend
- Solo se usa internamente para determinar qué base de datos consultar

### **PASO 5: Backend Obtiene Credenciales de la Base de Datos**

```typescript
// Backend: lib/env-config.ts (SOLO EN SERVIDOR)
export async function getHotelGroupConfigFromServer(hotelGroupId: string): Promise<HotelGroupConfig | null> {
  // VALIDACIÓN DE SEGURIDAD: Solo ejecutar en servidor
  if (typeof window !== 'undefined') {
    throw new Error('getHotelGroupConfigFromServer solo puede ejecutarse en el servidor')
  }

  try {
    // Configuración hardcodeada (en producción sería desde variables de entorno)
    const hotelGroups: Record<string, HotelGroupConfig> = {
      'test': {
        id: ['demo1', 'demo2', 'demo3'],
        name: 'Mi VPS Principal',
        supabase: {
          url: 'https://reqfyvseikyjztmnqjdt.supabase.co',
          anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Clave pública
        },
        postgres: {
          host: 'aws-0-eu-west-3.pooler.supabase.com',
          port: 6543,
          database: 'postgres',
          user: 'postgres.reqfyvseikyjztmnqjdt',
          password: 'Mclaren123321!', // ¡CREDENCIAL SENSIBLE!
          ssl: true
        }
      }
    }

    return hotelGroups[hotelGroupId] || null
  } catch (error) {
    console.error('Error getting hotel group config:', error)
    return null
  }
}
```

**¿Qué sucede?**
- Backend obtiene credenciales de la base de datos específica del usuario
- **NUNCA** se envían estas credenciales al frontend
- Solo se usan para establecer conexión a la base de datos correcta

### **PASO 6: Backend Se Conecta a la Base de Datos Correcta**

```typescript
// Backend: lib/database.ts (SOLO EN SERVIDOR)
export async function getHotelConnection(hotelGroupId: string): Promise<PoolClient | null> {
  try {
    // 1. Obtener configuración de BD (con credenciales sensibles)
    const dbConfig = await getHotelDatabaseConfig(hotelGroupId)
    if (!dbConfig) {
      console.error(`No database config found for hotel group: ${hotelGroupId}`)
      return null
    }

    // 2. Crear pool de conexiones usando credenciales sensibles
    const pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password, // Credencial sensible
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // 3. Obtener conexión del pool
    const client = await pool.connect()
    return client
  } catch (error) {
    console.error('Error connecting to database:', error)
    return null
  }
}

// Función principal para ejecutar consultas
export async function query(hotelGroupId: string, text: string, params?: any[]): Promise<any> {
  const client = await getHotelConnection(hotelGroupId)
  if (!client) {
    throw new Error(`Could not connect to database for hotel group: ${hotelGroupId}`)
  }

  try {
    // Ejecutar consulta en la BD específica del usuario
    const result = await client.query(text, params)
    return result
  } finally {
    // Liberar conexión
    client.release()
  }
}
```

**¿Qué sucede?**
- Se establece conexión a la base de datos específica del usuario
- Se usan credenciales que el frontend nunca ve
- Se ejecutan consultas filtradas por los hoteles del usuario

### **PASO 7: Backend Ejecuta Consultas Filtradas**

```typescript
// Backend: app/api/ops/route.ts
// Ejemplo de consulta filtrada por hoteles del usuario
const debugResult = await query(tenantId, `
  SELECT 
    COUNT(*) as total_messages,
    COUNT(DISTINCT hotel_id) as unique_hotels,
    MIN(received_ts) as earliest_date,
    MAX(received_ts) as latest_date,
    array_agg(DISTINCT hotel_id) as available_hotels
  FROM mail_message m
  WHERE m.received_ts BETWEEN $1 AND $2
    ${hotelFilter} -- Filtro dinámico por hoteles del usuario
`, [from, to])

// hotelFilter se construye dinámicamente:
// AND m.hotel_id = ANY($3) donde $3 = ['demo1', 'demo2', 'demo3']
```

**¿Qué sucede?**
- Se ejecutan consultas SQL en la base de datos del usuario
- Los datos se filtran automáticamente por los hoteles asignados
- El usuario solo ve datos de sus hoteles, no de toda la base de datos

### **PASO 8: Backend Devuelve Solo Datos Seguros**

```typescript
// Backend: app/api/ops/route.ts
const data = {
  // KPIs principales (solo datos de negocio)
  totalEmails: emailsResult.rows.length > 0 ? parseInt(emailsResult.rows[0]?.total_emails || 0) : null,
  emailsManual: emailsResult.rows.length > 0 ? parseInt(emailsResult.rows[0]?.emails_manual || 0) : null,
  avgResponseTime: avgResponseTimeResult.rows.length > 0 ? postgresIntervalToMinutes(avgResponseTimeResult.rows[0]?.avg_response_interval) : null,
  sla10min: sla10minResult.rows.length > 0 ? parseFloat(sla10minResult.rows[0]?.sla_10min_pct || 0) : null,
  upsellingRevenue: upsellingRevenueResult.rows.length > 0 ? parseFloat(upsellingRevenueResult.rows[0]?.total_revenue || 0) : null,
  
  // Datos para gráficas (solo datos de negocio)
  volume: volumeData,
  manual: manualData,
  slaTram: slaTramData,
  sentiment: sentimentData,
  language: languageData,
  category: categoryData,
  
  // ¡NUNCA se incluyen credenciales ni configuración sensible!
}

return NextResponse.json(data)
```

**¿Qué sucede?**
- Se devuelven SOLO los datos de negocio procesados
- **NUNCA** se envían credenciales, configuración o información sensible
- Los datos están filtrados por los hoteles del usuario autenticado

### **PASO 9: Frontend Recibe y Procesa los Datos**

```typescript
// Frontend: hooks/useRealDashboardData.ts
const apiData = await response.json()

// Procesar datos para gráficos
const processedData = processChartData(apiData, previousApiData, range, savingsParams)

// Establecer en el estado del componente
setData(processedData)
setError(null)
```

**¿Qué sucede?**
- Frontend recibe solo datos seguros de negocio
- No tiene acceso a credenciales ni configuración interna
- Procesa los datos para generar gráficos y visualizaciones

---

## 🔧 Variables de Entorno

### **Variables Públicas (Seguras para el Cliente)**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://reqfyvseikyjztmnqjdt.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**¿Por qué son seguras?**
- Se usan solo para autenticación básica
- No dan acceso a datos sensibles
- Se pueden ver en el código del cliente

### **Variables Privadas (Solo Servidor)**

```bash
# .env.local (NO se envían al cliente)
SUPABASE_AUTH_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
HOTEL_GROUP_TEST_POSTGRES_PASSWORD=Mclaren123321!
HOTEL_GROUP_TEST_POSTGRES_USER=postgres.reqfyvseikyjztmnqjdt
```

**¿Por qué son privadas?**
- Dan acceso completo a la base de datos
- Contienen credenciales sensibles
- Solo se ejecutan en el servidor

---

## 🚀 Backend - API Routes

### **Estructura de Archivos**

```
app/
├── api/
│   ├── ops/
│   │   └── route.ts          # API principal para datos del dashboard
│   ├── user-config/
│   │   └── route.ts          # API para configuración del usuario
│   └── hotel-info/
│       └── route.ts          # API para información de hoteles
```

### **API Principal: `/api/ops`**

```typescript
// app/api/ops/route.ts
export async function GET(request: NextRequest) {
  try {
    // 1. AUTENTICACIÓN
    const { user, tenantId } = await authenticateUser(request)
    
    // 2. OBTENER CONFIGURACIÓN
    const userConfig = await getUserConfigFromServer(user.email)
    const hotelGroupConfig = await getHotelGroupConfigFromServer(userConfig.hotel_group)
    
    // 3. EJECUTAR CONSULTAS
    const emailsResult = await query(tenantId, `
      SELECT COUNT(*) as total_emails
      FROM mail_message m
      WHERE m.received_ts BETWEEN $1 AND $2
        AND m.hotel_id = ANY($3)
    `, [from, to, userConfig.hotels])
    
    // 4. DEVOLVER DATOS SEGUROS
    return NextResponse.json({
      totalEmails: emailsResult.rows[0]?.total_emails || 0,
      // ... más datos
    })
    
  } catch (error) {
    console.error('Error en API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### **Middleware de Autenticación**

```typescript
// lib/auth-middleware.ts
export async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }
  
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid token')
  }
  
  return { user, tenantId: user.user_metadata?.tenant_id || 'test' }
}
```

---

## 🎨 Frontend - Hooks y Componentes

### **Hook Principal: `useRealDashboardData`**

```typescript
// hooks/useRealDashboardData.ts
export const useRealDashboardData = (savingsParams?: SavingsParams) => {
  const { session, selectedHotels } = useSupabase()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (range: DateRange, interval: string = 'auto') => {
    if (!session?.access_token) {
      setError('No hay sesión activa')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Construir URL con parámetros
      const apiUrl = `/api/ops?from=${range.from.toISOString().split('T')[0]}&to=${range.to.toISOString().split('T')[0]}&interval=${interval}`
      
      // Llamar a la API con token de autenticación
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const apiData = await response.json()
      
      // Procesar datos para gráficos
      const processedData = processChartData(apiData, previousApiData, range, savingsParams)
      
      setData(processedData)
      setError(null)
      
    } catch (error: any) {
      setError(error.message || 'Error al obtener datos')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, selectedHotels])

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.access_token) {
      fetchData(dateRange, currentInterval)
    }
  }, [session?.access_token])

  return { data, loading, error, refreshData: fetchData }
}
```

### **Componente Dashboard**

```typescript
// components/dashboard/Dashboard.tsx
export default function Dashboard() {
  const { data, loading, error } = useRealDashboardData()
  
  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorMessage error={error} />
  if (!data) return <NoDataMessage />
  
  return (
    <div className="dashboard">
      {/* KPIs principales */}
      <div className="kpi-grid">
        <KpiCard 
          title="Emails Totales" 
          value={data.totalEmails} 
          variation={data.totalEmailsVariation}
        />
        <KpiCard 
          title="Tiempo Respuesta" 
          value={data.avgResponseTime} 
          unit="min"
          variation={data.avgResponseTimeVariation}
        />
        {/* ... más KPIs */}
      </div>
      
      {/* Gráficos */}
      <div className="charts-grid">
        <ChartCard title="Volumen de Emails">
          <LineChart data={data.volume} />
        </ChartCard>
        
        <ChartCard title="SLA por Tramos">
          <DonutChart data={data.slaTram} />
        </ChartCard>
        
        {/* ... más gráficos */}
      </div>
    </div>
  )
}
```

---

## 🗄️ Base de Datos

### **Estructura Multi-Tenant**

```sql
-- Tabla principal de mensajes
CREATE TABLE mail_message (
  id UUID PRIMARY KEY,
  hotel_id VARCHAR(50) NOT NULL, -- Filtro por hotel del usuario
  received_ts TIMESTAMP NOT NULL,
  response_ts TIMESTAMP,
  manual_intervention BOOLEAN DEFAULT FALSE,
  -- ... más campos
);

-- Tabla de análisis de mensajes
CREATE TABLE mail_analysis (
  mail_uuid UUID REFERENCES mail_message(id),
  main_category VARCHAR(100),
  sub_category VARCHAR(100),
  sentiment VARCHAR(50),
  language VARCHAR(20),
  upselling_offer BOOLEAN DEFAULT FALSE,
  upsell_accepted BOOLEAN DEFAULT FALSE,
  upsell_revenue_eur DECIMAL(10,2),
  -- ... más campos
);

-- Tabla de incidencias
CREATE TABLE mail_incidencias (
  uuid UUID REFERENCES mail_message(id),
  delay_gestion_min INTEGER,
  delay_resolucion_min INTEGER,
  resenya_clicked BOOLEAN DEFAULT FALSE,
  -- ... más campos
);
```

### **Índices para Rendimiento**

```sql
-- Índices para consultas rápidas
CREATE INDEX idx_mail_message_hotel_date ON mail_message(hotel_id, received_ts);
CREATE INDEX idx_mail_message_date ON mail_message(received_ts);
CREATE INDEX idx_mail_analysis_upselling ON mail_analysis(upselling_offer, upsell_accepted);
CREATE INDEX idx_mail_incidencias_uuid ON mail_incidencias(uuid);
```

---

## 👥 Configuración de Usuarios y Hoteles

### **Sistema de Configuración**

```typescript
// lib/env-config.ts
export interface UserConfig {
  id: string
  name: string
  full_name: string
  hotel_group: string      // Grupo de hoteles asignado
  hotels: string[]         // Hoteles específicos del usuario
  role: string            // Rol del usuario (admin, user, etc.)
  status: string          // Estado del usuario (active, inactive)
  profileImage?: string   // Imagen de perfil
}

export interface HotelGroupConfig {
  id: string[]            // IDs de hoteles en este grupo
  name: string            // Nombre del grupo
  supabase: {
    url: string           // URL de Supabase
    anon_key: string      // Clave anónima (pública)
  }
  postgres: {
    host: string          // Host de PostgreSQL
    port: number          // Puerto de PostgreSQL
    database: string      // Nombre de la base de datos
    user: string          // Usuario de la base de datos
    password: string      // Contraseña (SENSIBLE)
    ssl: boolean          // Usar SSL
  }
}
```

### **Ejemplo de Configuración**

```typescript
const users = {
  'sergio@smarthotels.es': {
    id: 'sergio',
    name: 'Sergio',
    full_name: 'Sergio Barbero García',
    hotel_group: 'test',                    // Grupo 'test'
    hotels: ['demo1', 'demo2', 'demo3'],   // 3 hoteles
    role: 'admin',
    status: 'active'
  }
}

const hotelGroups = {
  'test': {
    id: ['demo1', 'demo2', 'demo3'],
    name: 'Mi VPS Principal',
    postgres: {
      host: 'aws-0-eu-west-3.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.reqfyvseikyjztmnqjdt',
      password: 'Mclaren123321!',           // ¡SENSIBLE!
      ssl: true
    }
  }
}
```

---

## 🚀 Instalación y Configuración

### **1. Clonar el Repositorio**

```bash
git clone https://github.com/tu-usuario/smarthotels-dashboard.git
cd smarthotels-dashboard
```

### **2. Instalar Dependencias**

```bash
npm install
```

### **3. Configurar Variables de Entorno**

```bash
# Copiar archivo de ejemplo
cp env.example .env.local

# Editar .env.local con tus credenciales
nano .env.local
```

**Contenido de `.env.local`:**
```bash
# Variables públicas (seguras para el cliente)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=tu_clave_anonima_aqui

# Variables privadas (solo servidor)
SUPABASE_AUTH_SERVICE_ROLE_KEY=tu_clave_service_role_aqui

# Configuración de usuarios y hoteles (JSON strings)
USER_CONFIGS={"tu-email@ejemplo.com":{"full_name":"Tu Nombre","tenant_id":"tu-grupo","role":"admin","profileImage":"default.png"}}
HOTEL_GROUP_CONFIGS={"tu-grupo":{"id":["hotel1","hotel2"],"name":"Tu Grupo","postgres":{"host":"tu-host.com","port":5432,"database":"tu_db","user":"tu_user","password":"tu_pass","ssl":true}}}
HOTEL_CONFIGS={"hotel1":{"id":"hotel1","name":"Hotel 1","stars":4,"rooms":100,"location":"Tu Ciudad"},"hotel2":{"id":"hotel2","name":"Hotel 2","stars":5,"rooms":150,"location":"Tu Ciudad"}}
```

### **4. Ejecutar el Servidor**

```bash
# Desarrollo local
npm run dev

# O usar el script de PowerShell (Windows)
.\start.ps1
```

---

## 🚀 Deployment en Vercel

### **Configuración Automática**

El proyecto está configurado para deployment automático en Vercel con el archivo `vercel.json`:

```json
{
  "version": 2,
  "name": "smarthotels-dashboard",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### **Pasos para Deploy**

1. **Conectar con GitHub:**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu cuenta de GitHub
   - Importa el repositorio `smarthotels-dashboard`

2. **Configurar Variables de Entorno:**
   - En el dashboard de Vercel, ve a Settings → Environment Variables
   - Añade las siguientes variables:

   ```bash
   # Variables públicas
   NEXT_PUBLIC_SUPABASE_AUTH_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=tu_clave_anonima_aqui
   
   # Variables privadas
   SUPABASE_AUTH_SERVICE_ROLE_KEY=tu_clave_service_role_aqui
   
   # Configuración JSON (reemplaza con tus datos)
   USER_CONFIGS={"tu-email@ejemplo.com":{"full_name":"Tu Nombre","tenant_id":"tu-grupo","role":"admin","profileImage":"default.png"}}
   HOTEL_GROUP_CONFIGS={"tu-grupo":{"id":["hotel1"],"name":"Tu Grupo","postgres":{"host":"tu-host.com","port":5432,"database":"tu_db","user":"tu_user","password":"tu_pass","ssl":true}}}
   HOTEL_CONFIGS={"hotel1":{"id":"hotel1","name":"Hotel 1","stars":4,"rooms":100,"location":"Tu Ciudad"}}
   ```

3. **Deploy Automático:**
   - Cada push a `main` se deployará automáticamente
   - Vercel detectará que es un proyecto Next.js y lo configurará automáticamente

4. **Dominio Personalizado (Opcional):**
   - En Settings → Domains, añade tu dominio personalizado
   - Configura los registros DNS según las instrucciones de Vercel

### **Consideraciones para Vercel**

- **Serverless Functions:** Las API routes se ejecutan como funciones serverless
- **Variables de Entorno:** Se configuran en el dashboard de Vercel
- **Base de Datos:** Asegúrate de que tu PostgreSQL sea accesible desde Vercel
- **Límites:** Las funciones serverless tienen límites de tiempo de ejecución (10s en plan gratuito)

---

## 🔧 Troubleshooting

### **Error: "Database connection failed"**

**Causa:** Problemas de conexión a la base de datos
**Solución:**
1. Verificar credenciales en variables de entorno
2. Verificar que la base de datos esté accesible desde Vercel
3. Verificar configuración de red y firewall
4. **En Vercel:** Asegurar que las variables `HOTEL_GROUP_CONFIGS` estén correctamente configuradas

### **Error: "Unauthorized"**

**Causa:** Token de autenticación inválido o expirado
**Solución:**
1. Verificar que el usuario esté autenticado
2. Verificar variables `NEXT_PUBLIC_SUPABASE_*` en Vercel
3. Revisar logs de autenticación en Vercel Functions

### **Error: "hotelIds.filter is not a function"**

**Causa:** Variable `hotelIds` no es un array
**Solución:**
1. Verificar que `USER_CONFIGS` esté correctamente formateado en Vercel
2. Asegurar que el JSON sea válido (sin comillas extra)
3. Revisar logs de Vercel Functions

### **Los Gráficos No Se Muestran**

**Causa:** Problemas en la API o datos vacíos
**Solución:**
1. Verificar logs de Vercel Functions
2. Verificar que la base de datos tenga datos
3. Verificar que las consultas SQL funcionen
4. Revisar la consola del navegador para errores

### **Error: "Function execution timeout" (Vercel)**

**Causa:** Las consultas a la base de datos tardan más de 10 segundos
**Solución:**
1. Optimizar consultas SQL con índices
2. Usar plan Pro de Vercel (límite de 60s)
3. Implementar paginación en consultas grandes
4. Usar caché para datos estáticos

### **Error: "Environment variable not found" (Vercel)**

**Causa:** Variables de entorno no configuradas en Vercel
**Solución:**
1. Verificar que todas las variables estén en Settings → Environment Variables
2. Asegurar que las variables estén en el entorno correcto (Production/Preview/Development)
3. Hacer redeploy después de añadir variables

---

## 📊 Ejemplo de Flujo Completo

### **Escenario: Usuario Sergio Accede al Dashboard**

1. **Autenticación:**
   ```
   Usuario: sergio@smarthotels.es
   Password: ********
   → Supabase valida credenciales
   → Se genera access_token
   ```

2. **Frontend Solicita Datos:**
   ```
   GET /api/ops?from=2025-07-26&to=2025-08-26
   Headers: Authorization: Bearer <access_token>
   ```

3. **Backend Procesa:**
   ```
   → Verifica token con Supabase Admin
   → Identifica usuario: sergio@smarthotels.es
   → Obtiene configuración: hotel_group='test', hotels=['demo1','demo2','demo3']
   → Conecta a BD usando credenciales sensibles
   → Ejecuta consultas filtradas por hoteles del usuario
   ```

4. **Datos Devueltos:**
   ```json
   {
     "totalEmails": 1486,
     "volume": [...],
     "upselling": {
       "offersSent": 1249,
       "offersAccepted": 426
     }
   }
   ```

5. **Frontend Renderiza:**
   ```
   → Recibe datos seguros
   → Genera gráficos y KPIs
   → Usuario ve solo datos de sus hoteles
   ```

---

## 🎯 Resumen de Seguridad

### **✅ Lo que SÍ ve el Cliente:**
- Variables `NEXT_PUBLIC_*`
- Datos de negocio procesados
- Gráficos y visualizaciones
- Interfaz de usuario

### **❌ Lo que NUNCA ve el Cliente:**
- Variables de entorno privadas
- Credenciales de base de datos
- Configuración interna del sistema
- Estructura de la base de datos

### **🛡️ Medidas de Seguridad Implementadas:**
1. **Separación de responsabilidades** entre frontend y backend
2. **Validación de ejecución solo en servidor** con `typeof window !== 'undefined'`
3. **Autenticación por token JWT** con Supabase
4. **Filtrado de datos por usuario** en la base de datos
5. **Manejo robusto de errores** sin exponer información sensible
6. **Variables de entorno separadas** por nivel de seguridad

---

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Guía de Seguridad de Next.js](https://nextjs.org/docs/advanced-features/security-headers)

---

## 📁 Estructura del Proyecto

### **Archivos Esenciales para Vercel**

```
smarthotels-dashboard/
├── app/                          # App Router de Next.js 14
│   ├── api/                      # API Routes (Serverless Functions)
│   │   ├── ops/route.ts         # API principal del dashboard
│   │   └── user-config/route.ts # API de configuración
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Dashboard principal
│   └── login/page.tsx           # Página de login
├── components/                   # Componentes React
│   ├── dashboard/               # Componentes del dashboard
│   ├── providers/               # Providers de contexto
│   └── ui/                      # Componentes UI reutilizables
├── lib/                         # Utilidades y configuración
│   ├── database.ts              # Conexión a PostgreSQL
│   ├── supabase.ts              # Cliente Supabase
│   ├── supabase-admin.ts        # Admin Supabase
│   ├── date-utils.ts            # Utilidades de fechas
│   ├── chart-colors.ts          # Colores de gráficos
│   └── utils.ts                 # Utilidades generales
├── hooks/                       # Hooks personalizados
├── public/                      # Assets estáticos
├── .eslintrc.json               # Configuración ESLint
├── .gitignore                   # Archivos ignorados por Git
├── .prettierrc                  # Configuración Prettier
├── env.example                  # Ejemplo de variables de entorno
├── next.config.js               # Configuración Next.js
├── package.json                 # Dependencias y scripts
├── postcss.config.js            # Configuración PostCSS
├── tailwind.config.js           # Configuración Tailwind CSS
├── tsconfig.json                # Configuración TypeScript
└── vercel.json                  # Configuración de Vercel
```

### **Archivos de Desarrollo (No necesarios en Vercel)**

- `start.ps1` - Script de PowerShell para desarrollo local
- `generar_datos.sql` - Script SQL para generar datos de prueba
- `tsconfig.tsbuildinfo` - Archivo de caché de TypeScript (se regenera)

### **Configuración de Vercel**

El archivo `vercel.json` está optimizado para:
- **Build automático** con Next.js
- **Headers de seguridad** (X-Frame-Options, CSP, etc.)
- **Variables de entorno** configuradas desde el dashboard
- **Deployment automático** desde GitHub

---

**¿Necesitas ayuda con algún aspecto específico del sistema?** 🚀
