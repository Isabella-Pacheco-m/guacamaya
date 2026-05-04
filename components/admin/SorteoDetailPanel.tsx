'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { SorteoConMeta, SorteoParticipacionAdmin } from '@/types'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

function formatTelefono(telefono: string | null): string {
  if (!telefono) return '—'
  const m = telefono.match(/^57(\d{3})(\d{3})(\d{4})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : telefono
}

const ESTADO_LABEL: Record<SorteoConMeta['estado'], string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  SORTEADO: 'Con ganador',
}

export function SorteoDetailPanel({
  sorteo: initialSorteo,
  participaciones: initialParticipaciones,
}: {
  sorteo: SorteoConMeta
  participaciones: SorteoParticipacionAdmin[]
}) {
  const router = useRouter()
  const [sorteo, setSorteo] = useState(initialSorteo)
  const [participaciones] = useState(initialParticipaciones)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cerrar() {
    if (!confirm('¿Cerrar el sorteo? Ya no aceptará nuevas participaciones.')) return
    setBusy('cerrar')
    setError(null)
    try {
      const res = await fetch(`/api/sorteos/${sorteo.id}/cerrar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cerrar')
        return
      }
      setSorteo((s) => ({ ...s, ...data.sorteo }))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  async function elegirGanador(miembroId: string | null) {
    if (
      !confirm(
        miembroId
          ? '¿Marcar a este participante como ganador?'
          : '¿Elegir un ganador al azar entre los participantes?'
      )
    )
      return
    setBusy(miembroId ?? 'random')
    setError(null)
    try {
      const res = await fetch(`/api/sorteos/${sorteo.id}/ganador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miembro_id: miembroId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo elegir ganador')
        return
      }
      const ganadorNombre =
        participaciones.find((p) => p.miembro_id === data.sorteo.ganador_miembro_id)
          ?.miembro_nombre ?? null
      setSorteo((s) => ({ ...s, ...data.sorteo, ganador_nombre: ganadorNombre }))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  const hayParticipantes = participaciones.length > 0
  const puedeCerrar = sorteo.estado === 'ABIERTO'
  const puedeElegir = sorteo.estado !== 'SORTEADO' && hayParticipantes

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {sorteo.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sorteo.imagen_url}
            alt=""
            className="w-full max-h-72 object-cover"
          />
        )}
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-xl font-medium">{sorteo.titulo}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide bg-surface text-muted border border-border rounded-full px-2 py-0.5">
                  {ESTADO_LABEL[sorteo.estado]}
                </span>
                <span className="text-xs text-muted">
                  {participaciones.length}{' '}
                  {participaciones.length === 1 ? 'participación' : 'participaciones'}
                </span>
                {sorteo.cierra_at && (
                  <span className="text-xs text-muted">
                    Cierra: {dateFmt.format(new Date(sorteo.cierra_at))}
                  </span>
                )}
              </div>
            </div>
          </div>
          {sorteo.descripcion && (
            <p className="text-sm text-graphite whitespace-pre-wrap">
              {sorteo.descripcion}
            </p>
          )}
          {sorteo.requisitos && (
            <div className="bg-surface rounded-md p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted mb-1">
                Requisitos
              </p>
              <p className="whitespace-pre-wrap">{sorteo.requisitos}</p>
            </div>
          )}
          {sorteo.ganador_nombre && (
            <div className="bg-lime/30 rounded-md p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-graphite/70 mb-1">
                Ganador
              </p>
              <p className="font-medium">{sorteo.ganador_nombre}</p>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            {puedeCerrar && (
              <Button variant="secondary" onClick={cerrar} disabled={busy !== null}>
                {busy === 'cerrar' ? 'Cerrando…' : 'Cerrar sorteo'}
              </Button>
            )}
            {puedeElegir && (
              <Button
                onClick={() => elegirGanador(null)}
                disabled={busy !== null}
              >
                {busy === 'random' ? 'Eligiendo…' : 'Elegir ganador al azar'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Participantes</h3>
        </div>
        {participaciones.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Aún no hay participantes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-5 py-3 font-medium">Miembro</th>
                  <th className="px-5 py-3 font-medium">Teléfono</th>
                  <th className="px-5 py-3 font-medium">Evidencia</th>
                  <th className="px-5 py-3 font-medium">Comentario</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {participaciones.map((p) => {
                  const isGanador = sorteo.ganador_miembro_id === p.miembro_id
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border last:border-0 ${isGanador ? 'bg-lime/20' : 'hover:bg-surface/50'}`}
                    >
                      <td className="px-5 py-3">
                        {p.miembro_nombre}
                        {isGanador && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide bg-graphite text-lime rounded-full px-2 py-0.5">
                            ganador
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {formatTelefono(p.miembro_telefono)}
                      </td>
                      <td className="px-5 py-3">
                        {p.evidencia_url ? (
                          <a
                            href={p.evidencia_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-electric text-xs hover:underline"
                          >
                            Ver foto →
                          </a>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted max-w-[240px] truncate">
                        {p.comentario || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted text-xs">
                        {dateFmt.format(new Date(p.created_at))}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {sorteo.estado !== 'SORTEADO' && (
                          <button
                            onClick={() => elegirGanador(p.miembro_id)}
                            disabled={busy !== null}
                            className="text-xs text-electric hover:underline disabled:opacity-50"
                          >
                            {busy === p.miembro_id ? 'Eligiendo…' : 'Marcar ganador'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
