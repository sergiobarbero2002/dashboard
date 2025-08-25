'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-simple'
import { getUserNameFromConfig, getHotelIdFromUser, getUserRoleFromConfig, getUserProfileImage, getHotelsFromUser } from '@/lib/user-config'
import { checkImageAndGetFallback } from '@/lib/image-utils'

type SupabaseContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  hotelId: string | null
  hotels: string[]
  selectedHotels: string[]
  userName: string | null
  userRole: string | null
  userProfileImage: string
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateSelectedHotels: (hotels: string[]) => void
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [hotels, setHotels] = useState<string[]>([])
  const [selectedHotels, setSelectedHotels] = useState<string[]>(() => {
    // Intentar recuperar hoteles seleccionados del localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedHotels')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfileImage, setUserProfileImage] = useState<string>('/assets/profiles/default.png')

  useEffect(() => {
    if (typeof window === 'undefined') return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Obtener hotel_id del metadata del usuario
      if (session?.user?.user_metadata?.hotel_id) {
        setHotelId(session.user.user_metadata.hotel_id)
      } else if (session?.user?.email) {
        // Obtener hotel_id desde la configuración de usuarios
        const configHotelId = getHotelIdFromUser(session.user.email)
        if (configHotelId) {
          setHotelId(configHotelId)
        }
      }

      // Obtener hoteles disponibles para el usuario
      if (session?.user?.email) {
        const userHotels = getHotelsFromUser(session.user.email)
        setHotels(userHotels)
        
        // Solo seleccionar todos los hoteles si no hay ninguno seleccionado
        // y no hay hoteles guardados en localStorage
        if (selectedHotels.length === 0 && userHotels.length > 0) {
          setSelectedHotels(userHotels)
          // Persistir la selección inicial
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedHotels', JSON.stringify(userHotels))
          }
        }
      }

      // Obtener nombre del usuario
      if (session?.user?.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name)
      } else if (session?.user?.email) {
        // Obtener nombre desde la configuración de usuarios
        const configUserName = getUserNameFromConfig(session.user.email)
        if (configUserName) {
          setUserName(configUserName)
        } else {
          // Extraer nombre del email como fallback
          const emailName = session.user.email.split('@')[0]
          setUserName(emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : null)
        }
      }

      // Obtener rol del usuario
      if (session?.user?.user_metadata?.role) {
        setUserRole(session.user.user_metadata.role)
      } else if (session?.user?.email) {
        // Obtener rol desde la configuración de usuarios
        const configUserRole = getUserRoleFromConfig(session.user.email)
        if (configUserRole) {
          setUserRole(configUserRole)
        }
      }

      // Obtener imagen de perfil del usuario
      if (session?.user?.email) {
        const profileImage = getUserProfileImage(session.user.email)
        // Verificar si la imagen está vacía y usar fallback si es necesario
        checkImageAndGetFallback(profileImage).then(validImage => {
          setUserProfileImage(validImage)
        }).catch(() => {
          setUserProfileImage('/assets/profiles/default.png')
        })
      }

      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Obtener hotel_id del metadata del usuario
      if (session?.user?.user_metadata?.hotel_id) {
        setHotelId(session.user.user_metadata.hotel_id)
      } else if (session?.user?.email) {
        // Obtener hotel_id desde la configuración de usuarios
        const configHotelId = getHotelIdFromUser(session.user.email)
        if (configHotelId) {
          setHotelId(configHotelId)
        }
      }

      // Obtener hoteles disponibles para el usuario
      if (session?.user?.email) {
        const userHotels = getHotelsFromUser(session.user.email)
        setHotels(userHotels)
        // Por defecto, seleccionar todos los hoteles disponibles
        setSelectedHotels(userHotels)
      }

      // Obtener nombre del usuario
      if (session?.user?.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name)
      } else if (session?.user?.email) {
        // Obtener nombre desde la configuración de usuarios
        const configUserName = getUserNameFromConfig(session.user.email)
        if (configUserName) {
          setUserName(configUserName)
        } else {
          // Extraer nombre del email como fallback
          const emailName = session.user.email.split('@')[0]
          setUserName(emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : null)
        }
      }

      // Obtener rol del usuario
      if (session?.user?.user_metadata?.role) {
        setUserRole(session.user.user_metadata.role)
      } else if (session?.user?.email) {
        // Obtener rol desde la configuración de usuarios
        const configUserRole = getUserRoleFromConfig(session.user.email)
        if (configUserRole) {
          setUserRole(configUserRole)
        }
      }

      // Obtener imagen de perfil del usuario
      if (session?.user?.email) {
        const profileImage = getUserProfileImage(session.user.email)
        // Verificar si la imagen está vacía y usar fallback si es necesario
        checkImageAndGetFallback(profileImage).then(validImage => {
          setUserProfileImage(validImage)
        }).catch(() => {
          setUserProfileImage('/assets/profiles/default.png')
        })
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      console.error('Error in signIn:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error in signOut:', error)
      throw error
    }
  }

  const updateSelectedHotels = (hotels: string[]) => {
    // Evitar arrays vacíos
    if (hotels.length === 0) return
    
    setSelectedHotels(hotels)
    
    // Persistir en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedHotels', JSON.stringify(hotels))
    }
  }

  const value = {
    user,
    session,
    loading,
    hotelId,
    hotels,
    selectedHotels,
    userName,
    userRole,
    userProfileImage,
    signIn,
    signOut,
    updateSelectedHotels
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
