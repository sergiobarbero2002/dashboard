'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { checkImageAndGetFallback } from '@/lib/image-utils'

interface ProfileImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  fallbackSrc?: string
}

export function ProfileImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  fallbackSrc = '/assets/profiles/default.png'
}: ProfileImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const verifyImage = async () => {
      if (!src || src === fallbackSrc) {
        setImageSrc(fallbackSrc)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const validImage = await checkImageAndGetFallback(src)
        
        if (isMounted) {
          setImageSrc(validImage)
          setHasError(false)
        }
      } catch (error) {
        if (isMounted) {
          setImageSrc(fallbackSrc)
          setHasError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    verifyImage()

    return () => {
      isMounted = false
    }
  }, [src, fallbackSrc])

  const handleImageError = () => {
    setImageSrc(fallbackSrc)
    setHasError(true)
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'animate-pulse bg-gray-200' : ''}`}
        priority={priority}
        onError={handleImageError}
      />
      
      {/* Indicador de estado */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse" />
      )}
      
      {/* Indicador de error */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  )
}
