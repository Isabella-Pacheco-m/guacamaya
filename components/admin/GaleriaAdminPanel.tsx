'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { GaleriaPostAdmin } from '@/lib/galeria'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

type Tab = 'pendiente' | 'aprobado' | 'rechazado'

export function GaleriaAdminPanel({
  initialPendientes,
  initialAprobadas,
  initialRechazadas,
  puntosDefault,
}: {
  initialPendientes: GaleriaPostAdmin[]
  initialAprobadas: GaleriaPostAdmin[]
  initialRechazadas: GaleriaPostAdmin[]
  puntosDefault: number
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pendiente')
  const [pendientes, setPendientes] = useState(initialPendientes)
  const [aprobadas] = useState(initialAprobadas)
  const [rechazadas] = useState(initialRechazadas)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Puntos por defecto editable (persistido en tenant_features vía funcionalidades).
  const [puntos, setPuntos] = useState(String(puntosDefault))
  const [savingPuntos, setSavingPuntos] = useState(false)
  const [puntosMsg, setPuntosMsg] = useState<string | null>(null)
  const puntosNum = Number(puntos)
  const puntosValido =
    Number.isInteger(puntosNum) && puntosNum >= 0 && puntosNum <= 100000

  async function guardarPuntos() {
    if (!puntosValido || savingPuntos) return
    setSavingPuntos(true)
    setPuntosMsg(null)
    try {
      const res = await fetch('/api/tenant/funcionalidades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galeria_puntos: puntosNum }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPuntosMsg(data.error ?? 'No se pudo guardar')
        return
      }
      setPuntosMsg('Guardado')
      router.refresh()
    } catch (e) {
      setPuntosMsg(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSavingPuntos(false)
    }
  }

  async function moderar(id: string, accion: 'aprobar' | 'rechazar') {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/galeria/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          accion === 'aprobar' ? { accion, puntos: puntosNum } : { accion }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo procesar')
        return
      }
      setPendientes((prev) => prev.filter((p) => p.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  const lista =
    tab === 'pendiente' ? pendientes : tab === 'aprobado' ? aprobadas : rechazadas

  return (
    <div className="flex flex-col gap-6">
      {/* Config de puntos */}
      <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-2">
        <label className="text-sm font-medium text-graphite">
          Puntos por foto aprobada
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100000}
            value={puntos}
            onChange={(e) => {
              setPuntos(e.target.value)
              setPuntosMsg(null)
            }}
            className="w-32 border border-border rounded-md px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm tabular-nums"
          />
          <Button
            variant="secondary"
            onClick={guardarPuntos}
            disabled={savingPuntos || !puntosValido}
          >
            {savingPuntos ? 'Guardando…' : 'Guardar'}
          </Button>
          {puntosMsg && (
            <span className="text-xs text-muted">{puntosMsg}</span>
          )}
        </div>
        <span className="text-xs text-muted">
          Se acreditan al aprobar cada foto. Puedes ajustarlos antes de aprobar.
          {!puntosValido && ' Debe ser entero entre 0 y 100000.'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(
          [
            ['pendiente', `Pendientes (${pendientes.length})`],
            ['aprobado', 'Aprobadas'],
            ['rechazado', 'Rechazadas'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              'rounded-full border px-4 py-2 text-sm transition-colors ' +
              (tab === t
                ? 'border-graphite bg-graphite text-white'
                : 'border-border bg-white text-graphite hover:border-graphite/40')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-muted">
          {tab === 'pendiente'
            ? 'No hay fotos pendientes de revisión.'
            : tab === 'aprobado'
              ? 'Aún no has aprobado fotos.'
              : 'No hay fotos rechazadas.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg shadow-card overflow-hidden flex flex-col"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imagen_url}
                alt=""
                className="w-full aspect-square object-cover bg-surface"
              />
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="text-sm">
                  <p className="font-medium text-graphite truncate">
                    {p.miembro_nombre}
                  </p>
                  <p className="text-[11px] text-muted">
                    {dateFmt.format(new Date(p.created_at))}
                  </p>
                </div>
                {p.caption && (
                  <p className="text-sm text-graphite/90">{p.caption}</p>
                )}
                {tab === 'pendiente' ? (
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      onClick={() => moderar(p.id, 'aprobar')}
                      disabled={busy === p.id}
                      className="flex-1"
                    >
                      {busy === p.id ? '…' : `Aprobar +${puntosNum}`}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => moderar(p.id, 'rechazar')}
                      disabled={busy === p.id}
                    >
                      Rechazar
                    </Button>
                  </div>
                ) : (
                  <span
                    className={
                      'mt-auto text-[11px] font-medium uppercase tracking-wide ' +
                      (tab === 'aprobado' ? 'text-electric' : 'text-muted')
                    }
                  >
                    {tab === 'aprobado'
                      ? `Aprobada · +${p.puntos_otorgados} pts`
                      : 'Rechazada'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
