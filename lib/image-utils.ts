/**
 * Utilidades para manejo de imágenes de perfil
 */

import { useState, useEffect } from 'react'

/**
 * Obtiene la ruta de la imagen de perfil
 * @param imageName - Nombre del archivo de imagen (opcional)
 * @returns Ruta de la imagen a usar
 */
export function getProfileImagePath(imageName?: string): string {
  if (!imageName) {
    return '/assets/profiles/default.png'
  }
  return `/assets/profiles/${imageName}`
}

/**
 * Verifica si una imagen está vacía (0 bytes) y retorna la imagen por defecto si es así
 * @param imagePath - Ruta de la imagen a verificar
 * @returns Promise que resuelve a la ruta de imagen a usar
 */
export async function checkImageAndGetFallback(imagePath: string): Promise<string> {
  try {
    // Intentar cargar la imagen
    const response = await fetch(imagePath)
    
    // Si la respuesta no es exitosa, usar imagen por defecto
    if (!response.ok) {
      return '/assets/profiles/default.png'
    }
    
    // Obtener el tamaño del archivo
    const contentLength = response.headers.get('content-length')
    
    // Si no hay content-length o es 0, usar imagen por defecto
    if (!contentLength || parseInt(contentLength) === 0) {
      return '/assets/profiles/default.png'
    }
    
    // Verificar que la imagen se pueda cargar correctamente
    const blob = await response.blob()
    
    // Si el blob está vacío o es muy pequeño (menos de 100 bytes), usar imagen por defecto
    if (blob.size === 0 || blob.size < 100) {
      return '/assets/profiles/default.png'
    }
    
    // La imagen es válida, retornar la ruta original
    return imagePath
  } catch (error) {
    // Si hay algún error, usar imagen por defecto
    console.warn('Error al verificar imagen de perfil:', error)
    return '/assets/profiles/default.png'
  }
}

/**
 * Hook personalizado para manejar imágenes de perfil con fallback automático
 * @param imagePath - Ruta de la imagen a verificar
 * @returns Objeto con la imagen actual y estado de carga
 */
export function useProfileImage(imagePath: string) {
  const [currentImage, setCurrentImage] = useState<string>('/assets/profiles/default.png')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const checkImage = async () => {
      setIsLoading(true)
      try {
        const validImage = await checkImageAndGetFallback(imagePath)
        if (isMounted) {
          setCurrentImage(validImage)
        }
      } catch (error) {
        if (isMounted) {
          setCurrentImage('/assets/profiles/default.png')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkImage()

    return () => {
      isMounted = false
    }
  }, [imagePath])

  return { currentImage, isLoading }
}
