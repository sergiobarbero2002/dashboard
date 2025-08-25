'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useSound } from '@/hooks/useSound'
import { ProfileImage } from '@/components/ui/ProfileImage'

export function ProfileMenu() {
  const { user, userName, userProfileImage, signOut } = useSupabase()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { playClick } = useSound()
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    playClick()
    console.log('🔄 Iniciando proceso de logout...')
    
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        console.log('✅ Usuario confirmó logout, ejecutando signOut...')
        setIsLoggingOut(true)
        
        await signOut()
        console.log('✅ signOut ejecutado correctamente')
        
        console.log('🔄 Redirigiendo a /login...')
        router.push('/login')
      } catch (error) {
        console.error('❌ Error al cerrar sesión:', error)
        alert('Error al cerrar sesión. Inténtalo de nuevo.')
      } finally {
        setIsLoggingOut(false)
        console.log('🔄 Estado de logout reseteado')
      }
    } else {
      console.log('❌ Usuario canceló el logout')
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón del perfil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        aria-label="Menú de perfil"
      >
        <div className="relative">
          <ProfileImage
            src={userProfileImage}
            alt="Perfil del Usuario"
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            priority
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">{userName || 'Hotel'}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        
        <ChevronDown 
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Header del perfil */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
                             <ProfileImage
                 src={userProfileImage}
                 alt="Perfil del Usuario"
                 width={48}
                 height={48}
                 className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
               />
              <div>
                <p className="font-semibold text-gray-900">{userName || 'Hotel SmartHotels'}</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">Administrador del Sistema</p>
              </div>
            </div>
          </div>

          {/* Opciones del menú */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false)
                // Aquí podrías agregar navegación a perfil o configuración
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
            >
              <User className="h-4 w-4" />
              Ver Perfil
            </button>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-100 my-2"></div>

          {/* Botón de cerrar sesión */}
          <div className="px-4 py-2">
            <Button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
