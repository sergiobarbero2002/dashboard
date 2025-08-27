'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

interface NotFoundProps {
  notFound?: boolean
}

// Componente unificado simplificado para manejar todos los tipos de errores
export default function ErrorHandler({ error, reset, notFound }: ErrorProps & NotFoundProps) {
  useEffect(() => {
    // Log del error en consola para debugging
    if (error) {
      console.error('🚨 === ERROR EN LA APLICACIÓN ===')
      console.error('Error completo:', error)
      console.error('Stack trace:', error.stack)
      console.error('Digest:', error.digest)
      console.error('Mensaje:', error.message)
      console.error('Nombre:', error.name)
      console.error('Fecha:', new Date().toISOString())
      console.error('URL:', window.location.href)
      console.error('User Agent:', navigator.userAgent)
      console.error('🚨 === FIN DEL ERROR ===')
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header con logo de SmartHotels */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-white">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">SmartHotels Dashboard</h1>
            <p className="text-blue-100 text-lg">Ha ocurrido un error en el sistema</p>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Lo sentimos, algo salió mal
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Nuestro equipo técnico ha sido notificado del problema. 
              Por favor, contacta con soporte para obtener ayuda inmediata.
            </p>
          </div>

          {/* Información de contacto */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-blue-800">Contacta con Soporte</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-blue-600 font-medium">Email:</span>
                <a 
                  href="mailto:sergio@smarthotels.es" 
                  className="text-blue-700 hover:text-blue-800 underline font-medium"
                >
                  sergio@smarthotels.es
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-600 font-medium">Asunto:</span>
                <span className="text-gray-700">Error en SmartHotels Dashboard</span>
              </div>
              <div className="text-sm text-blue-600">
                Incluye el código de error que aparece más abajo para una atención más rápida.
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Volver al inicio
            </button>
          </div>

          {/* Detalles técnicos del error */}
          {error && (
            <div className="border border-gray-200 rounded-lg">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-t-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Detalles técnicos del error (para soporte)
                  </span>
                  <svg 
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <div className="space-y-4">
                    {/* Información básica del error */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Información del Error:</h4>
                      <div className="bg-white p-3 rounded border text-sm font-mono text-gray-800 space-y-1">
                        <div><span className="text-gray-600">Tipo:</span> {error.name}</div>
                        <div><span className="text-gray-600">Mensaje:</span> {error.message}</div>
                        {error.digest && (
                          <div><span className="text-gray-600">Digest:</span> {error.digest}</div>
                        )}
                        <div><span className="text-gray-600">Fecha:</span> {new Date().toISOString()}</div>
                        <div><span className="text-gray-600">URL:</span> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
                      </div>
                    </div>

                    {/* Stack trace */}
                    {error.stack && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Stack Trace:</h4>
                        <div className="bg-white p-3 rounded border text-xs font-mono text-gray-800 max-h-40 overflow-y-auto">
                          {error.stack.split('\n').map((line, index) => (
                            <div key={index} className="whitespace-pre-wrap">{line}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Información del navegador */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Información del Navegador:</h4>
                      <div className="bg-white p-3 rounded border text-sm font-mono text-gray-800 space-y-1">
                        <div><span className="text-gray-600">User Agent:</span> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</div>
                        <div><span className="text-gray-600">Plataforma:</span> {typeof navigator !== 'undefined' ? navigator.platform : 'N/A'}</div>
                        <div><span className="text-gray-600">Idioma:</span> {typeof navigator !== 'undefined' ? navigator.language : 'N/A'}</div>
                      </div>
                    </div>

                    {/* Instrucciones para el usuario */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Para obtener ayuda más rápida:</p>
                          <ul className="list-disc list-inside space-y-1 text-yellow-700">
                            <li>Copia toda la información técnica de arriba</li>
                            <li>Envía un email a sergio@smarthotels.es</li>
                            <li>Incluye una descripción de lo que estabas haciendo</li>
                            <li>Adjunta una captura de pantalla si es posible</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>SmartHotels Dashboard - Sistema de Gestión Hotelera</p>
            <p className="mt-1">Si el problema persiste, contacta con soporte técnico</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Exportar también como NotFound para compatibilidad
export function NotFound() {
  return <ErrorHandler notFound={true} error={new Error('Page not found')} reset={() => {}} />
}
