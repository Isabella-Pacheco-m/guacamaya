import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getTenantBySlug } from '@/lib/tenant'

// Manifest dinámico: cada tenant ve su propia PWA con nombre + theme.
// Sin slug (root host) → manifest genérico Guacamaya.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const slug = headers().get('x-tenant-slug') || ''
  const tenant = slug ? await getTenantBySlug(slug) : null

  const name = tenant?.nombre ?? 'Guacamaya'
  const themeColor = tenant?.color_primario ?? '#1A1A1E'

  return {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: 'Tu club de miembros',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F5F3',
    theme_color: themeColor,
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon0',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
