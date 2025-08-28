'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'
import { useSound } from '@/hooks/useSound'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import Image from 'next/image'
import { ParticlesBackground } from '@/components/ui/ParticlesBackground'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  
  const { signInWithPassword } = useSupabase()
  const router = useRouter()
  const { playClick, playSuccess } = useSound()
  const { toasts, removeToast, showSuccess, showError } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError(null)
    setSuccess(false)
    setIsDemo(false)

    try {
      await signInWithPassword({ email, password })
      
      // Mostrar mensaje de éxito
      setSuccess(true)
      showSuccess('¡Sesión iniciada correctamente!')
      playSuccess() // Sonido de éxito
      
      // Redirigir después de 1.5 segundos para que el usuario vea el mensaje
      setTimeout(() => {
        router.push('/')
      }, 1500)
      
    } catch (err: any) {
      let errorMessage = 'Error al iniciar sesión.'
      
      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.'
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Email no confirmado. Revisa tu bandeja de entrada.'
        } else if (err.message.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
        } else {
          errorMessage = `Error: ${err.message}`
        }
      }
      
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputClick = () => {
    playClick() // Sonido al hacer clic en los inputs
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setIsDemo(true)

    try {
      await signInWithPassword({ email: 'demo@smarthotels.es', password: 'demo123' })
      setSuccess(true)
      showSuccess('¡Demo iniciada correctamente!')
      playSuccess()
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err: any) {
      let errorMessage = 'Error al iniciar sesión de demo.'
      if (err.message) {
        errorMessage = `Error de demo: ${err.message}`
      }
      setError(errorMessage)
      showError(errorMessage)
      setIsDemo(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo de partículas */}
      <ParticlesBackground />
      
      {/* Contenido del login */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border-2 border-smarthotels-gold/30 hover:border-smarthotels-gold/60 transition-all duration-500 hover:shadow-3xl">
        {/* Botón para volver a la página principal */}
        <div className="absolute -top-4 -left-4 z-20">
          <a
            href="https://smarthotels.es"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-smarthotels-gold text-white text-sm font-medium rounded-full shadow-lg hover:bg-yellow-600 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl border-2 border-white"
            onClick={() => playClick()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver a SmartHotels</span>
          </a>
        </div>
        
        <div className="flex justify-center mb-6">
          <Image
            src="/assets/images/smarthotels-logo.png"
            alt="SmartHotels Logo"
            width={320}
            height={90}
            className="h-24 object-contain transition-transform duration-300 hover:scale-110"
            priority
          />
        </div>
        
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
          Dashboard SmartHotels
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          Sistema de Gestión Inteligente para Hoteles
        </p>
        
        {/* Mensaje de éxito */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">
                {isDemo ? '¡Demo iniciada!' : '¡Sesión iniciada!'}
              </span>
            </div>
            <p className="text-green-700 text-xs mt-1">
              {isDemo ? 'Redirigiendo...' : 'Redirigiendo...'}
            </p>
          </div>
        )}
        
        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-xs">{error}</div>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="group">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 transition-colors duration-200 group-hover:text-smarthotels-gold">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-smarthotels-gold focus:border-smarthotels-gold transition-all duration-300 hover:border-smarthotels-gold/50 hover:shadow-md transform hover:-translate-y-0.5"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onClick={handleInputClick}
              required
              disabled={loading || success}
            />
          </div>
          
          <div className="group">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 transition-colors duration-200 group-hover:text-smarthotels-gold">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-smarthotels-gold focus:border-smarthotels-gold transition-all duration-300 hover:border-smarthotels-gold/50 hover:shadow-md transform hover:-translate-y-0.5"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onClick={handleInputClick}
              required
              disabled={loading || success}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg transform hover:-translate-y-1" 
            disabled={loading || success}
          >
            {loading ? 'Iniciando sesión...' : success ? '¡Sesión iniciada!' : 'Iniciar Sesión'}
          </Button>

          {/* Separador */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/90 text-gray-500">o</span>
            </div>
          </div>

          {/* Botón de Demo */}
          <Button 
            type="button"
            variant="outline"
            className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 transform hover:-translate-y-1"
            onClick={handleDemoLogin}
            disabled={loading || success}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg transition-transform duration-300 hover:rotate-12">🚀</span>
              <span className="font-medium">
                {loading && isDemo ? 'Iniciando demo...' : 'Ver Demo'}
              </span>
            </div>
          </Button>
        </form>
        
        {/* Información de ayuda simplificada */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Soporte: contact@smarthotels.es</p>
        </div>
      </div>

      {/* Sistema de Notificaciones */}
      <ToastContainer 
        toasts={toasts.map(toast => ({
          ...toast,
          onClose: removeToast
        }))} 
        onClose={removeToast} 
      />
    </div>
  )
}
