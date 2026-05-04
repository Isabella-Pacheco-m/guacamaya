'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { TarjetaPremio } from '@/lib/tenantQueries'

export function TarjetaPremiosForm({
  initial,
  tarjetaSize,
}: {
  initial: TarjetaPremio[]
  tarjetaSize: number
}) {
  const router = useRouter()
  const [premios, setPremios] = useState<TarjetaPremio[]>(initial)
  const [threshold, setThreshold] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setError(null)
    const t = Number(threshold)
    if (!Number.isInteger(t) || t < 1 || t > tarjetaSize) {
      setError(`El umbral debe ser entero entre 1 y ${tarjetaSize}`)
      return
    }
    if (descripcion.trim().length === 0) {
      setError('La descripción no puede estar vacía')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/tenant/tarjeta-premios', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threshold: t, descripcion: descripcion.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo guardar')
        return
      }
      setPremios((prev) => {
        const filtrado = prev.filter((p) => p.threshold !== t)
        return [...filtrado, { threshold: t, descripcion: descripcion.trim() }].sort(
          (a, b) => a.threshold - b.threshold
        )
      })
      setThreshold('')
      setDescripcion('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function remove(t: number) {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(
        `/api/tenant/tarjeta-premios?threshold=${t}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo eliminar')
        return
      }
      setPremios((prev) => prev.filter((p) => p.threshold !== t))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-lg shadow-card p-5">
        <p className="text-sm text-graphite mb-4">
          Define los premios que tu cliente desbloquea al alcanzar cada cantidad
          de sellos. El premio del último umbral ({tarjetaSize}) reinicia la
          tarjeta cuando se canjea.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            min={1}
            max={tarjetaSize}
            placeholder="Sellos"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm w-full sm:w-32 focus:outline-none focus:ring-1 focus:ring-electric"
          />
          <input
            type="text"
            placeholder="Premio (ej: café gratis)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
            className="border border-border rounded-md px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-electric"
          />
          <Button onClick={add} disabled={saving}>
            Guardar
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {premios.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Aún no has definido premios. Agrega el primero arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                <th className="px-6 py-3 font-medium w-32">Sellos</th>
                <th className="px-6 py-3 font-medium">Premio</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {premios.map((p) => (
                <tr
                  key={p.threshold}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-6 py-4 tabular-nums">
                    {p.threshold} {p.threshold === tarjetaSize && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-graphite text-lime rounded-full px-2 py-0.5">
                        final
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{p.descripcion}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => remove(p.threshold)}
                      disabled={saving}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
