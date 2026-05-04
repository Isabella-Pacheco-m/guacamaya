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
]

const COP = new Intl.NumberFormat('es-CO')

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
              <TarjetaConfig
                state={state}
                loading={loading}
                savedKey={savedKey}
                onPatch={(key, body, revert) => patch(key, body, revert)}
                onLocalChange={(updater) => setState(updater)}
              />
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

function TarjetaConfig({
  state,
  loading,
  savedKey,
  onPatch,
  onLocalChange,
}: {
  state: TenantFeatures
  loading: string | null
  savedKey: string | null
  onPatch: (
    key: string,
    body: Record<string, unknown>,
    revert: () => void
  ) => Promise<void>
  onLocalChange: (updater: (s: TenantFeatures) => TenantFeatures) => void
}) {
  const [size, setSize] = useState<string>(String(state.tarjeta_size))
  const [valor, setValor] = useState<string>(
    state.sello_valor_cop != null ? String(state.sello_valor_cop) : ''
  )

  async function saveSize() {
    const n = Number(size)
    if (!Number.isInteger(n) || n < 1 || n > 100) return
    if (n === state.tarjeta_size) return
    const prev = state.tarjeta_size
    onLocalChange((s) => ({ ...s, tarjeta_size: n }))
    await onPatch('tarjeta_size', { tarjeta_size: n }, () => {
      onLocalChange((s) => ({ ...s, tarjeta_size: prev }))
      setSize(String(prev))
    })
  }

  async function saveValor() {
    const trimmed = valor.trim()
    let nuevoValor: number | null
    if (trimmed === '') {
      nuevoValor = null
    } else {
      const n = Number(trimmed)
      if (!Number.isInteger(n) || n <= 0) return
      nuevoValor = n
    }
    if (nuevoValor === state.sello_valor_cop) return
    const prev = state.sello_valor_cop
    onLocalChange((s) => ({ ...s, sello_valor_cop: nuevoValor }))
    await onPatch('sello_valor_cop', { sello_valor_cop: nuevoValor }, () => {
      onLocalChange((s) => ({ ...s, sello_valor_cop: prev }))
      setValor(prev != null ? String(prev) : '')
    })
  }

  return (
    <div className="border-t border-border pt-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            Espacios en la tarjeta
            {savedKey === 'tarjeta_size' && (
              <span className="ml-2 text-[11px] text-graphite bg-lime/40 rounded-full px-2 py-0.5">
                guardado
              </span>
            )}
          </span>
          <input
            type="number"
            min={1}
            max={100}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            onBlur={saveSize}
            disabled={loading === 'tarjeta_size'}
            className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            Valor por sello (COP, opcional)
            {savedKey === 'sello_valor_cop' && (
              <span className="ml-2 text-[11px] text-graphite bg-lime/40 rounded-full px-2 py-0.5">
                guardado
              </span>
            )}
          </span>
          <input
            type="number"
            min={0}
            placeholder="ej: 10000"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onBlur={saveValor}
            disabled={loading === 'sello_valor_cop'}
            className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
          />
          {state.sello_valor_cop != null && (
            <span className="text-[11px] text-muted">
              ${COP.format(state.sello_valor_cop)} = 1 sello
            </span>
          )}
        </label>
      </div>
      <Link
        href="/admin/tarjeta"
        className="text-electric text-sm hover:underline self-start"
      >
        Configurar premios →
      </Link>
    </div>
  )
}
