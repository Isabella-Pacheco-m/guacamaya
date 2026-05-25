'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export function CumpleanosPrompt({
  initialMes,
}: {
  initialMes: number | null
}) {
  const router = useRouter()
  const [mes, setMes] = useState<number | null>(initialMes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMes, setSavedMes] = useState<number | null>(initialMes)

  async function pick(nuevoMes: number) {
    if (saving) return
    setSaving(true)
    setError(null)
    const prev = savedMes
    setMes(nuevoMes)
    try {
      const res = await fetch('/api/me/cumpleanos', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mes_cumpleanos: nuevoMes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // 409 = el mes ya estaba definido en el servidor (UI desactualizada).
        // Refrescamos para mostrar el estado real (tarjeta de solo lectura).
        if (res.status === 409) {
          router.refresh()
        }
        throw new Error(data.error || 'No se pudo guardar')
      }
      setSavedMes(nuevoMes)
      router.refresh()
    } catch (err) {
      setMes(prev)
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  if (savedMes != null) {
    return (
      <Card className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted mb-1">
          Mes de cumpleaños
        </p>
        <p className="text-graphite">
          {MESES[savedMes - 1]} — recibirás ofertas especiales ese mes.
        </p>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <p className="text-xs uppercase tracking-wider text-electric mb-2">
        Cuéntanos cuándo cumples
      </p>
      <p className="text-sm text-graphite mb-1">
        Activa ofertas especiales durante tu mes de cumpleaños.
      </p>
      <p className="text-xs text-muted mb-4">
        Solo puedes elegirlo una vez, así que confírmalo bien.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {MESES.map((label, idx) => {
          const valor = idx + 1
          const seleccionado = mes === valor
          return (
            <button
              key={valor}
              type="button"
              disabled={saving}
              onClick={() => pick(valor)}
              className={
                seleccionado
                  ? 'rounded-full px-3 py-2 text-xs font-medium bg-graphite text-lime'
                  : 'rounded-full px-3 py-2 text-xs font-medium border border-border text-graphite hover:border-graphite disabled:opacity-50'
              }
            >
              {label.slice(0, 3)}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </Card>
  )
}
