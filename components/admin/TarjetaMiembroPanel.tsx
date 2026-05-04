'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { TarjetaPremioEstado } from '@/lib/tenantQueries'

export function TarjetaMiembroPanel({
  miembroId,
  initialSellos,
  tarjetaSize,
  initialPremios,
}: {
  miembroId: string
  initialSellos: number
  tarjetaSize: number
  initialPremios: TarjetaPremioEstado[]
}) {
  const router = useRouter()
  const [sellos, setSellos] = useState(initialSellos)
  const [premios, setPremios] = useState(initialPremios)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addSello() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/miembros/${miembroId}/sello`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo agregar el sello')
        return
      }
      setSellos(data.miembro.sellos_actuales)
      setPremios((prev) =>
        prev.map((p) => ({
          ...p,
          alcanzado: data.miembro.sellos_actuales >= p.threshold,
        }))
      )
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(false)
    }
  }

  async function canjearPremio(threshold: number) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/miembros/${miembroId}/sello/canje`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threshold }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo canjear')
        return
      }
      setSellos(data.miembro.sellos_actuales)
      // si fue el final, los demás se desbloquean en el siguiente ciclo:
      // refrescar desde el server para que la lista refleje el ciclo nuevo
      router.refresh()
      setPremios((prev) =>
        prev.map((p) =>
          p.threshold === threshold
            ? { ...p, canjeado: true }
            : { ...p, alcanzado: data.miembro.sellos_actuales >= p.threshold }
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(false)
    }
  }

  const cells = Array.from({ length: tarjetaSize }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm">
            <span className="text-2xl font-light tabular-nums">{sellos}</span>
            <span className="text-muted text-sm"> / {tarjetaSize} sellos</span>
          </p>
          <button
            onClick={addSello}
            disabled={busy}
            className="bg-lime text-graphite font-medium rounded-full px-5 py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            +1 sello
          </button>
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {cells.map((n) => {
            const filled = n <= sellos
            return (
              <div
                key={n}
                className={
                  filled
                    ? 'aspect-square rounded-full bg-graphite text-lime text-[10px] flex items-center justify-center'
                    : 'aspect-square rounded-full border border-border text-muted text-[10px] flex items-center justify-center'
                }
              >
                {n}
              </div>
            )
          })}
        </div>
      </div>

      {premios.length === 0 ? (
        <p className="text-xs text-muted">
          No hay premios configurados.{' '}
          <Link href="/admin/tarjeta" className="text-electric hover:underline">
            Configurar premios
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {premios.map((p) => (
            <li
              key={p.threshold}
              className="flex items-center justify-between gap-3 border border-border rounded-md px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="tabular-nums font-medium">
                    {p.threshold}
                  </span>{' '}
                  · {p.descripcion}
                </p>
                {p.threshold === tarjetaSize && (
                  <p className="text-[10px] uppercase tracking-wide text-muted mt-0.5">
                    Premio final · reinicia la tarjeta
                  </p>
                )}
              </div>
              {p.canjeado ? (
                <span className="text-xs text-muted">Canjeado</span>
              ) : p.alcanzado ? (
                <button
                  onClick={() => canjearPremio(p.threshold)}
                  disabled={busy}
                  className="text-xs bg-graphite text-lime rounded-full px-4 py-1.5 hover:opacity-90 disabled:opacity-50"
                >
                  Canjear
                </button>
              ) : (
                <span className="text-xs text-muted">
                  Faltan {p.threshold - sellos}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
