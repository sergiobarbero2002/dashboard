import { useCallback } from 'react'

export function useSound() {
  const playClick = useCallback(() => {
    try {
      const audio = new Audio('/assets/FX/click.mp3')
      audio.volume = 0.3 // Volumen al 30%
      audio.play().catch(error => {
        console.log('No se pudo reproducir el sonido:', error)
      })
    } catch (error) {
      console.log('Error al reproducir sonido:', error)
    }
  }, [])

  const playSuccess = useCallback(() => {
    try {
      const audio = new Audio('/assets/FX/success.mp3')
      audio.volume = 0.4 // Volumen al 40%
      audio.play().catch(error => {
        console.log('No se pudo reproducir el sonido de éxito:', error)
      })
    } catch (error) {
      console.log('Error al reproducir sonido de éxito:', error)
    }
  }, [])

  return {
    playClick,
    playSuccess
  }
}

