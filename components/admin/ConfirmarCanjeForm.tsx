'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const numFmt = new Intl.NumberFormat('es-CO')

export function ConfirmarCanjeForm({
  miembroId,
  miembroNombre,
  recompensaId,
  recompensaNombre,
  costoPuntos,
  saldoActual,
}: {
  miembroId: string
  miembroNombre: string
  recompensaId: string
  recompensaNombre: string
  costoPuntos: number
  saldoActual: number
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ saldoNuevo: number } | null>(null)

  const saldoTras = saldoActual - costoPuntos
  const alcanza = saldoActual >= costoPuntos

  async function confirmar() {
    if (loading || success) return
    setLoading(true)
    setError(null)
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
        setError(data.error ?? 'No se pudo procesar el canje')
        return
      }
      setSuccess({ saldoNuevo: data.miembro?.puntos_actuales ?? saldoTras })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="bg-lime/30 border border-lime/40 rounded-md px-4 py-6">
          <p className="text-lg font-medium">Canje exitoso</p>
          <p className="text-sm text-muted mt-1">
            {miembroNombre} canjeó {recompensaNombre}.
          </p>
          <p className="text-sm mt-3">
            Saldo nuevo:{' '}
            <span className="font-medium">
              {numFmt.format(success.saldoNuevo)} puntos
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-surface rounded-md p-3">
          <p className="text-xs uppercase tracking-wider text-muted">Saldo actual</p>
          <p className="text-lg font-light mt-1">{numFmt.format(saldoActual)}</p>
        </div>
        <div className="bg-surface rounded-md p-3">
          <p className="text-xs uppercase tracking-wider text-muted">Tras canje</p>
          <p className="text-lg font-light mt-1">{numFmt.format(saldoTras)}</p>
        </div>
      </div>

      {!alcanza && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          Puntos insuficientes — el cliente no puede canjear esta recompensa.
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="button" onClick={confirmar} disabled={loading || !alcanza}>
        {loading ? 'Procesando...' : 'Confirmar canje'}
      </Button>
    </div>
  )
}
