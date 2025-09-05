'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Crear partículas doradas más visibles
    const particles: Particle[] = []
    const particleCount = 300

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.6 + 0.3
      })
    }

    particlesRef.current = particles

    // Función de animación simple
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Fondo sutil dorado
      ctx.fillStyle = 'rgba(245, 158, 11, 0.03)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Actualizar y dibujar partículas doradas
      particles.forEach(particle => {
        // Mover partícula
        particle.x += particle.vx
        particle.y += particle.vy

        // Rebotar en los bordes
        if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1
        if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1

        // Mantener en pantalla
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))

        // Dibujar partícula dorada con gradiente
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        )
        gradient.addColorStop(0, `rgba(245, 158, 11, ${particle.opacity})`)
        gradient.addColorStop(1, `rgba(245, 158, 11, ${particle.opacity * 0.3})`)
        
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
        
        // Añadir brillo sutil
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.5})`
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        background: 'linear-gradient(135deg, #fefefe 0%, #f8f9fa 50%, #f1f3f4 100%)',
        opacity: 0.8
      }}
    />
  )
}
