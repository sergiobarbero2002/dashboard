'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient, User, Session } from '@supabase/supabase-js'

interface SupabaseContextType {
  session: Session | null
  user: User | null
  hotels: string[]
  hotelsData: Array<{
    id: string
    name: string
    stars: number
    rooms: number
    location: string
  }>
  selectedHotels: string[]
  updateSelectedHotels: (hotels: string[]) => void
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<any>
  signOut: () => Promise<void>
  userName: string | null
  userRole: string | null
  userProfileImage: string | null
  loading: boolean
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [hotels, setHotels] = useState<string[]>([])
  const [hotelsData, setHotelsData] = useState<Array<{
    id: string
    name: string
    stars: number
    rooms: number
    location: string
  }>>([])
  const [selectedHotels, setSelectedHotels] = useState<string[]>([])
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Función para cargar configuración del usuario desde el nuevo endpoint
  const loadUserConfiguration = useCallback(async (email: string, accessToken: string) => {
    try {
      const response = await fetch('/api/user-config', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userConfig = await response.json()
        
        // Establecer hoteles disponibles (IDs)
        setHotels(userConfig.hotel_ids || [])
        
        // Establecer datos completos de hoteles
        setHotelsData(userConfig.hotels || [])
        
        // Establecer hoteles seleccionados por defecto
        if (selectedHotels.length === 0 && userConfig.hotel_ids?.length > 0) {
          setSelectedHotels(userConfig.hotel_ids)
          // Persistir en localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedHotels', JSON.stringify(userConfig.hotel_ids))
          }
        }
        
        // Establecer información del usuario
        setUserName(userConfig.full_name)
        setUserRole(userConfig.role)
        setUserProfileImage(userConfig.profileImage ? `/assets/profiles/${userConfig.profileImage}` : '/assets/profiles/default.png')
        
        console.log('✅ Configuración de usuario cargada:', userConfig)
      } else {
        console.error('Error loading user configuration:', response.status)
      }
    } catch (error) {
      console.error('Error loading user configuration:', error)
    }
  }, [selectedHotels])

  // Función para verificar imagen y obtener fallback
  const checkImageAndGetFallback = async (imagePath: string): Promise<string> => {
    try {
      const response = await fetch(imagePath)
      if (response.ok) {
        return imagePath
      }
    } catch (error) {
      console.warn('Error checking image:', imagePath)
    }
    return '/assets/profiles/default.png'
  }

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
    )

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user?.email && session?.access_token) {
        await loadUserConfiguration(session.user.email, session.access_token)
      }

      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user?.email && session?.access_token) {
        await loadUserConfiguration(session.user.email, session.access_token)
      } else {
        // Usuario desconectado, limpiar estado
        setHotels([])
        setHotelsData([])
        setSelectedHotels([])
        setUserName(null)
        setUserRole(null)
        setUserProfileImage(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserConfiguration])

  // Cargar hoteles seleccionados desde localStorage al inicializar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHotels = localStorage.getItem('selectedHotels')
      if (savedHotels) {
        try {
          const parsedHotels = JSON.parse(savedHotels)
          if (Array.isArray(parsedHotels)) {
            setSelectedHotels(parsedHotels)
          }
        } catch (error) {
          console.error('Error parsing saved hotels:', error)
        }
      }
    }
  }, [])

  // Persistir cambios en hoteles seleccionados
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedHotels.length > 0) {
      localStorage.setItem('selectedHotels', JSON.stringify(selectedHotels))
    }
  }, [selectedHotels])

  // Funciones de autenticación
  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
    )
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
    )
    await supabase.auth.signOut()
    
    // Limpiar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedHotels')
    }
  }

  const value = {
    session,
    user,
    hotels,
    hotelsData,
    selectedHotels,
    updateSelectedHotels: setSelectedHotels,
    signInWithPassword,
    signOut,
    userName,
    userRole,
    userProfileImage,
    loading
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}
