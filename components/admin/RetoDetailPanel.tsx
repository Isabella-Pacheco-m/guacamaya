'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { RetoParticipacionAdmin } from '@/lib/retos'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const ESTADO_META: Record<string, { label: string; cls: string }> = {
  cumplido: { label: 'Cumplido', cls: 'bg-electric/10 text-electric' },
  rechazado: { label: 'Rechazado', cls: 'bg-red-50 text-red-600' },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
}

export function RetoDetailPanel({
  participaciones: initial,
  puntosDefault,
}: {
  participaciones: RetoParticipacionAdmin[]
  puntosDefault: number
}) {
  const router = useRouter()
  const [lista, setLista] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Puntos a acreditar por participación (editable, arranca en el valor del reto).
  const [puntos, setPuntos] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((p) => [p.id, String(puntosDefault)]))
  )

  async function revisar(id: string, accion: 'cumplir' | 'rechazar') {
    setBusy(id)
    setError(null)
    try {
      const body =
        accion === 'cumplir'
          ? { accion, puntos: Number(puntos[id] ?? puntosDefault) }
          : { accion }
      const res = await fetch(`/api/reto-participaciones/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo procesar')
        return
      }
      const nuevo = data.participacion as { estado: string; puntos_otorgados: number }
      setLista((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, estado: nuevo.estado as RetoParticipacionAdmin['estado'], puntos_otorgados: nuevo.puntos_otorgados }
            : p
        )
      )
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  if (lista.length === 0) {
    return <p className="text-sm text-muted">Nadie ha participado todavía.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {lista.map((p) => {
        const meta = ESTADO_META[p.estado] ?? ESTADO_META.pendiente
        return (
          <div key={p.id} className="bg-white rounded-lg shadow-card p-4 flex gap-4">
            {p.evidencia_url ? (
              <a href={p.evidencia_url} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.evidencia_url}
                  alt="evidencia"
                  className="h-24 w-24 rounded-md object-cover bg-surface"
                />
              </a>
            ) : (
              <div className="h-24 w-24 rounded-md bg-surface shrink-0 grid place-items-center text-[11px] text-muted text-center px-2">
                Sin evidencia
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-graphite truncate">{p.miembro_nombre}</p>
                  <p className="text-[11px] text-muted">{dateFmt.format(new Date(p.created_at))}</p>
                </div>
                <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ' + meta.cls}>
                  {meta.label}
                  {p.estado === 'cumplido' && p.puntos_otorgados > 0 ? ` · +${p.puntos_otorgados}` : ''}
                </span>
              </div>
              {p.comentario && <p className="text-sm text-graphite/90">{p.comentario}</p>}
              {p.estado === 'pendiente' && (
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <span>+</span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={puntos[p.id] ?? String(puntosDefault)}
                      onChange={(e) => setPuntos((s) => ({ ...s, [p.id]: e.target.value }))}
                      className="w-20 border border-border rounded-md px-2 py-1 text-sm tabular-nums outline-none focus:ring-2 focus:ring-electric/30"
                    />
                    pts
                  </div>
                  <Button onClick={() => revisar(p.id, 'cumplir')} disabled={busy === p.id}>
                    {busy === p.id ? '…' : 'Cumplió'}
                  </Button>
                  <Button variant="danger" onClick={() => revisar(p.id, 'rechazar')} disabled={busy === p.id}>
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
