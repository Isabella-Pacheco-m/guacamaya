import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'
import './globals.css'

export const metadata: Metadata = {
  title: 'Guacamaya',
  description: 'Club de miembros con la marca de tu negocio.',
}

export const viewport: Viewport = {
  themeColor: '#2A2320',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
