'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { Miembro, Recompensa } from '@/types'

const COP = new Intl.NumberFormat('es-CO')

export function ProcesarCanjeForm({
  miembros,
  recompensas,
}: {
  miembros: Miembro[]
  recompensas: Recompensa[]
}) {
  const router = useRouter()
  const [miembroId, setMiembroId] = useState('')
  const [recompensaId, setRecompensaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const miembro = useMemo(
    () => miembros.find((m) => m.id === miembroId) ?? null,
    [miembros, miembroId]
  )
  const recompensa = useMemo(
    () => recompensas.find((r) => r.id === recompensaId) ?? null,
    [recompensas, recompensaId]
  )

  const puntosInsuficientes =
    !!miembro && !!recompensa && miembro.puntos_actuales < recompensa.costo_puntos
  const saldoTras =
    miembro && recompensa
      ? miembro.puntos_actuales - recompensa.costo_puntos
      : null

  const canSubmit =
    !!miembroId && !!recompensaId && !puntosInsuficientes && !loading

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/canjes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          miembro_id: miembroId,
          recompensa_id: recompensaId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al procesar canje')
        return
      }
      setSuccess(
        `Canje procesado · ${data.recompensa.nombre} · saldo ${COP.format(
          data.miembro.puntos_actuales
        )} pts`
      )
      setMiembroId('')
      setRecompensaId('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (miembros.length === 0) {
    return (
      <p className="text-muted text-sm">
        No hay miembros aún. Crea uno desde la sección Miembros.
      </p>
    )
  }
  if (recompensas.length === 0) {
    return (
      <p className="text-muted text-sm">
        No hay recompensas activas. Activa una desde la sección Recompensas.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 sm:col-span-1">
        <span className="text-sm font-medium">Miembro</span>
        <select
          value={miembroId}
          onChange={(e) => setMiembroId(e.target.value)}
          disabled={loading}
          required
          className="border border-border rounded-md px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
        >
          <option value="">Selecciona un miembro</option>
          {miembros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre} · {COP.format(m.puntos_actuales)} pts
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 sm:col-span-1">
        <span className="text-sm font-medium">Recompensa</span>
        <select
          value={recompensaId}
          onChange={(e) => setRecompensaId(e.target.value)}
          disabled={loading}
          required
          className="border border-border rounded-md px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
        >
          <option value="">Selecciona una recompensa</option>
          {recompensas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre} · {COP.format(r.costo_puntos)} pts
            </option>
          ))}
        </select>
      </label>

      {miembro && recompensa && (
        <div className="sm:col-span-2 text-sm">
          {puntosInsuficientes ? (
            <span className="text-red-600">
              Puntos insuficientes · faltan{' '}
              {COP.format(recompensa.costo_puntos - miembro.puntos_actuales)} pts
            </span>
          ) : (
            <span className="text-muted">
              Saldo después del canje:{' '}
              <span className="text-graphite font-medium tabular-nums">
                {COP.format(saldoTras ?? 0)} pts
              </span>
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="sm:col-span-2 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="sm:col-span-2 text-sm text-graphite bg-lime/20 rounded-md px-4 py-3">
          {success}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {loading ? 'Procesando...' : 'Procesar canje'}
        </Button>
      </div>
    </form>
  )
}
