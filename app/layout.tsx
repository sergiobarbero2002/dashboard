import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SmartHotels Dashboard',
  description: 'Dashboard de rendimiento del sistema de respuestas automatizadas por IA para hoteles',
  icons: {
    icon: [
      {
        url: '/assets/images/smarthotels-logo.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/assets/images/smarthotels-logo.png',
        sizes: '64x64',
        type: 'image/png',
      },
    ],
    shortcut: '/assets/images/smarthotels-logo.png',
    apple: '/assets/images/smarthotels-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/smarthotels-logo.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/assets/images/smarthotels-logo.png" />
        <link rel="shortcut icon" href="/assets/images/smarthotels-logo.png" />
        <link rel="apple-touch-icon" href="/assets/images/smarthotels-logo.png" />
      </head>
      <body className={inter.className}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
