'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const COP = new Intl.NumberFormat('es-CO')

export function RegistrarCompraForm({
  miembroId,
  puntosPorMil,
}: {
  miembroId: string
  puntosPorMil: number
}) {
  const router = useRouter()
  const [montoStr, setMontoStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const monto = parseInt(montoStr.replace(/[^\d]/g, ''), 10)
  const puntosPreview =
    Number.isFinite(monto) && monto > 0
      ? Math.floor(monto / 1000) * puntosPorMil
      : 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || !Number.isFinite(monto) || monto <= 0) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/miembros/${miembroId}/compra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_cop: monto }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al registrar compra')
        return
      }
      setSuccess(
        `+${COP.format(data.transaccion.puntos_delta)} puntos · saldo ${COP.format(data.miembro.puntos_actuales)}`
      )
      setMontoStr('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label="Monto de la compra (COP)"
        name="monto"
        inputMode="numeric"
        value={montoStr}
        onChange={(e) => setMontoStr(e.target.value)}
        placeholder="50000"
        hint={
          puntosPreview > 0
            ? `Equivale a ${COP.format(puntosPreview)} puntos`
            : `Tasa: ${puntosPorMil} ${puntosPorMil === 1 ? 'punto' : 'puntos'} por cada 1.000 COP`
        }
        disabled={loading}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && (
        <div className="text-sm text-graphite bg-lime/30 border border-lime/40 rounded-md px-4 py-3">
          {success}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || !Number.isFinite(monto) || monto <= 0}
        >
          {loading ? 'Registrando...' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  )
}
