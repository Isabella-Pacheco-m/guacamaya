'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'

// Pantalla de auto-registro: un usuario logueado que aún no es miembro de esta
// comunidad puede unirse de un clic (registro abierto). Al unirse, se refresca
// la ruta y el server la vuelve a renderizar ya como miembro (PWA home).
export function TenantJoin({
  nombre,
  logoUrl,
  colorPrimario,
}: {
  nombre: string
  logoUrl: string | null
  colorPrimario: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function unirse() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/me/unirse', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo completar')
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-tenant-halo flex items-center justify-center px-6">
      <TenantTheme color={colorPrimario} />
      <div className="max-w-md w-full text-center">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={nombre}
            className="h-20 w-20 rounded-md object-contain mx-auto mb-8"
          />
        )}
        <p className="text-[11px] uppercase tracking-[0.2em] text-electric mb-4">
          Club de miembros
        </p>
        <h1 className="text-[40px] font-light leading-[1.05] tracking-tight mb-4">
          {nombre}
        </h1>
        <p className="text-muted text-sm mb-10 max-w-xs mx-auto">
          Únete para acumular puntos por cada compra y canjear recompensas.
        </p>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        <Button className="w-full" onClick={unirse} disabled={loading}>
          {loading ? 'Uniéndote...' : 'Unirme'}
        </Button>
        <a href="/api/auth/logout" className="inline-block mt-4">
          <span className="text-xs text-muted hover:text-graphite">
            Cerrar sesión
          </span>
        </a>
      </div>
    </main>
  )
}
