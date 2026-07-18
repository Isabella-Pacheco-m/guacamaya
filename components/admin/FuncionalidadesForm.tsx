'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { TenantFeatures, FeatureKey } from '@/lib/tenant-features'

interface FeatureMeta {
  key: FeatureKey
  label: string
  description: string
  status: 'available' | 'soon'
}

const FEATURES: FeatureMeta[] = [
  {
    key: 'cumpleanos_enabled',
    label: 'Cumpleaños',
    description:
      'Pídele el mes de cumpleaños a tus clientes y mándales un beneficio el día especial.',
    status: 'available',
  },
  {
    key: 'tarjeta_enabled',
    label: 'Tarjeta de fidelización',
    description:
      'Sellos manuales por compra, paralelos a los puntos. Defines el tamaño y los premios por umbral.',
    status: 'available',
  },
  {
    key: 'feed_enabled',
    label: 'Feed de comunidad',
    description:
      'Publica novedades, eventos y promos. Tus clientes las ven en la PWA.',
    status: 'available',
  },
  {
    key: 'sorteos_enabled',
    label: 'Sorteos',
    description:
      'Crea sorteos donde los clientes participan subiendo factura, follow, etc.',
    status: 'available',
  },
  {
    key: 'notas_enabled',
    label: 'Notas',
    description:
      'Deja notas tipo post-it para tu comunidad: avisos, horarios o mensajes cortos que tus clientes ven en la PWA.',
    status: 'available',
  },
  {
    key: 'galeria_enabled',
    label: 'Galería',
    description:
      'Tus clientes suben fotos del local o de tus productos. Tú apruebas cuáles se publican y les das puntos por participar.',
    status: 'available',
  },
  {
    key: 'lanzamientos_enabled',
    label: 'Lanzamientos',
    description:
      'Anuncia productos nuevos con campaña de expectativa: banner, cuenta regresiva y revelado. Ideal para generar hype antes de un lanzamiento.',
    status: 'available',
  },
  {
    key: 'retos_enabled',
    label: 'Retos',
    description:
      'Proponles metas a tus clientes (visita 3 veces, prueba un producto…). Suben evidencia, tú la verificas y todos los que cumplen ganan puntos.',
    status: 'available',
  },
]

export function FuncionalidadesForm({ initial }: { initial: TenantFeatures }) {
  const router = useRouter()
  const [state, setState] = useState<TenantFeatures>(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  async function patch(
    key: string,
    body: Record<string, unknown>,
    revertOnError: () => void
  ) {
    if (loading) return
    setLoading(key)
    setError(null)
    setSavedKey(null)
    try {
      const res = await fetch('/api/tenant/funcionalidades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        revertOnError()
        setError(data.error ?? 'No se pudo guardar')
        return
      }
      setState(data)
      setSavedKey(key)
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500)
      router.refresh()
    } catch (e) {
      revertOnError()
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(null)
    }
  }

  async function toggle(key: FeatureKey, next: boolean) {
    const prev = state[key]
    setState((s) => ({ ...s, [key]: next }))
    await patch(key, { [key]: next }, () =>
      setState((s) => ({ ...s, [key]: prev }))
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {FEATURES.map((f) => {
        const checked = state[f.key]
        const isLoading = loading === f.key
        const disabled = f.status === 'soon' || (loading !== null && !isLoading)
        const showTarjetaConfig = f.key === 'tarjeta_enabled' && checked
        const showGaleriaConfig = f.key === 'galeria_enabled' && checked
        return (
          <div
            key={f.key}
            className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-4"
          >
            <div className="flex items-start gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-medium text-graphite">
                    {f.label}
                  </h3>
                  {f.status === 'soon' && (
                    <span className="text-[10px] uppercase tracking-wide bg-surface text-muted border border-border rounded-full px-2 py-0.5">
                      pronto
                    </span>
                  )}
                  {savedKey === f.key && (
                    <span className="text-[11px] text-graphite bg-lime/40 rounded-full px-2 py-0.5">
                      guardado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  {f.description}
                </p>
              </div>
              <Toggle
                checked={checked}
                onChange={(v) => toggle(f.key, v)}
                disabled={disabled}
                loading={isLoading}
              />
            </div>
            {showTarjetaConfig && (
              <div className="border-t border-border pt-4">
                <Link
                  href="/admin/tarjeta"
                  className="text-electric text-sm hover:underline"
                >
                  Configurar tarjeta (tamaño, valor, diseño y premios) →
                </Link>
              </div>
            )}
            {showGaleriaConfig && (
              <div className="border-t border-border pt-4">
                <Link
                  href="/admin/galeria"
                  className="text-electric text-sm hover:underline"
                >
                  Revisar fotos y configurar puntos por publicación →
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  disabled,
  loading,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`shrink-0 mt-0.5 relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-graphite' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
      {loading && <span className="sr-only">Guardando...</span>}
    </button>
  )
}

