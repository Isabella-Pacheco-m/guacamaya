'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  NOTA_COLORS,
  notaColorStyle,
  type Nota,
  type NotaColor,
} from '@/lib/notas'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
})

export function NotasAdminPanel({ initial }: { initial: Nota[] }) {
  const router = useRouter()
  const [notas, setNotas] = useState<Nota[]>(initial)
  const [cuerpo, setCuerpo] = useState('')
  const [color, setColor] = useState<NotaColor>('amarillo')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    const text = cuerpo.trim()
    if (!text) {
      setError('Escribe algo para la nota')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuerpo: text, color, pinned }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo crear la nota')
        return
      }
      setNotas((prev) => [data.nota as Nota, ...prev])
      setCuerpo('')
      setPinned(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar esta nota?')) return
    setDeleting(id)
    setError(null)
    try {
      const res = await fetch(`/api/notas/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo eliminar')
        return
      }
      setNotas((prev) => prev.filter((n) => n.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setDeleting(null)
    }
  }

  const previewStyle = notaColorStyle(color)

  return (
    <div className="flex flex-col gap-8">
      {/* Composer */}
      <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-4">
        <div
          className="rounded-xl p-4 min-h-[96px] shadow-sm"
          style={{ background: previewStyle.bg, border: `1px solid ${previewStyle.border}` }}
        >
          <textarea
            rows={3}
            maxLength={500}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            placeholder="Escribe una nota para tu comunidad…"
            className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed placeholder:opacity-60"
            style={{ color: previewStyle.text }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {NOTA_COLORS.map((c) => {
              const s = notaColorStyle(c)
              const active = c === color
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={s.label}
                  onClick={() => setColor(c)}
                  className={
                    'h-7 w-7 rounded-full transition-transform ' +
                    (active ? 'ring-2 ring-graphite ring-offset-2 scale-105' : 'hover:scale-105')
                  }
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                />
              )
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-graphite cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 accent-electric"
            />
            Fijar arriba
          </label>

          <Button onClick={crear} disabled={saving}>
            {saving ? 'Publicando…' : 'Publicar nota'}
          </Button>
        </div>

        <span className="text-xs text-muted">{cuerpo.length}/500 caracteres</span>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Lista */}
      {notas.length === 0 ? (
        <p className="text-sm text-muted">
          Aún no hay notas. Publica la primera arriba.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notas.map((n) => {
            const s = notaColorStyle(n.color)
            return (
              <div
                key={n.id}
                className="relative rounded-xl p-4 shadow-sm flex flex-col min-h-[120px]"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                {n.pinned && (
                  <span
                    className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
                    style={{ background: s.text, color: s.bg }}
                  >
                    Fijada
                  </span>
                )}
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap flex-1 pr-10"
                  style={{ color: s.text }}
                >
                  {n.cuerpo}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: s.text, opacity: 0.7 }}>
                    {dateFmt.format(new Date(n.created_at))}
                  </span>
                  <button
                    type="button"
                    onClick={() => borrar(n.id)}
                    disabled={deleting === n.id}
                    className="text-[11px] font-medium underline decoration-transparent hover:decoration-current disabled:opacity-50"
                    style={{ color: s.text }}
                  >
                    {deleting === n.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
