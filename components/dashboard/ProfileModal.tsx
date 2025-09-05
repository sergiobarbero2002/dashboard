'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { X, User, Building2, Crown, Shield, MapPin, Star, Bed, Calendar, Mail, Phone, Globe, BarChart3 } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useSound } from '@/hooks/useSound'
import { ProfileImage } from '@/components/ui/ProfileImage'
import './profile-modal-styles.css'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, userName, userRole, userProfileImage, hotelsData } = useSupabase()
  const { playClick } = useSound()


  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleClose = () => {
    playClick()
    onClose()
  }



  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <Crown className="h-5 w-5 text-yellow-600" />
      case 'manager':
        return <Shield className="h-5 w-5 text-blue-600" />
      case 'user':
        return <User className="h-5 w-5 text-green-600" />
      default:
        return <User className="h-5 w-5 text-gray-600" />
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'Administrador del Sistema'
      case 'manager':
        return 'Gerente de Hotel'
      case 'user':
        return 'Usuario'
      default:
        return 'Usuario'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 min-h-screen">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 profile-modal mx-auto my-auto">
        
        {/* Header del Modal */}
        <div className="bg-gradient-to-r from-smarthotels-gold to-yellow-500 p-6 text-white relative profile-modal-header">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200 close-button"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProfileImage
                src={userProfileImage || '/assets/profiles/default.png'}
                alt="Foto de Perfil"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg"
                priority
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{userName || 'Usuario'}</h1>
              <div className="flex items-center gap-2 mb-2">
                {getRoleIcon(userRole || 'user')}
                <span className="text-lg font-semibold">{getRoleDisplayName(userRole || 'user')}</span>
              </div>
              <p className="text-white/90 text-lg">{user?.email}</p>
            </div>
            

          </div>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)] profile-modal-content">
          
          {/* Información Personal */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-smarthotels-gold" />
              Información Personal
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 info-field">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                  <p className="text-gray-900 font-medium">{userName || 'No especificado'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 info-field">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <p className="text-gray-900 font-medium">{user?.email || 'No especificado'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 info-field">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Rol en el Sistema</label>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(userRole || 'user')}
                    <span className="text-gray-900 font-medium">{getRoleDisplayName(userRole || 'user')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 info-field">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Estado de la Cuenta</label>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full status-indicator"></div>
                    <span className="text-gray-900 font-medium">Activa</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 info-field">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Última Actividad</label>
                  <p className="text-gray-900 font-medium">
                    {new Date().toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 info-field">
                  <label className="block text-sm font-medium text-gray-600 mb-1">ID de Usuario</label>
                  <p className="text-gray-900 font-mono text-sm">{user?.id || 'No disponible'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hoteles Asignados */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-smarthotels-gold" />
              Hoteles Asignados ({hotelsData?.length || 0})
            </h2>
            
            {hotelsData && hotelsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotelsData.map((hotel: any) => (
                  <div key={hotel.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 hover:shadow-lg transition-all duration-300 hotel-card">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 text-lg">{hotel.name}</h3>
                      <div className="flex items-center gap-1">
                        {[...Array(hotel.stars || 0)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {hotel.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{hotel.location}</span>
                        </div>
                      )}
                      
                      {hotel.rooms && (
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-gray-400" />
                          <span>{hotel.rooms} habitaciones</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>ID: {hotel.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay hoteles asignados</p>
                <p className="text-gray-400 text-sm">Contacta con el administrador del sistema</p>
              </div>
            )}
          </div>

          {/* Estadísticas del Usuario */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-smarthotels-gold" />
              Estadísticas del Usuario
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 text-center border border-green-200 stats-card">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {hotelsData?.length || 0}
                </div>
                <div className="text-sm text-green-700">Hoteles</div>
              </div>
              
                             <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center border border-blue-200 stats-card">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {userRole === 'admin' ? 'Todos' : 'Limitado'}
                </div>
                <div className="text-sm text-blue-700">Permisos</div>
              </div>
              
                             <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 text-center border border-purple-200 stats-card">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {userRole === 'admin' ? 'Completo' : 'Parcial'}
                </div>
                <div className="text-sm text-purple-700">Acceso</div>
              </div>
              
                             <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center border border-orange-200 stats-card">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  Activo
                </div>
                <div className="text-sm text-orange-700">Estado</div>
              </div>
            </div>
          </div>

          {/* Información del Sistema */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-smarthotels-gold" />
              Información del Sistema
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Versión del Sistema</label>
                  <p className="text-gray-900">SmartHotels Dashboard v1.0</p>
                </div>
                    
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Soporte Técnico</label>
                  <p className="text-gray-900">contact@smarthotels.es</p>
                </div>
                
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 profile-modal-footer">
          <Button
            onClick={handleClose}
            variant="outline"
            className="px-6 footer-button"
          >
            Cerrar
          </Button>
          

        </div>
      </div>
    </div>
  )
}
