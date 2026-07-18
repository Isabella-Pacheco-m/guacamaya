'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { RetoAdmin } from '@/lib/retos'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

export function RetosAdminPanel({ initial }: { initial: RetoAdmin[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lista, setLista] = useState(initial)

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [requisitos, setRequisitos] = useState('')
  const [puntos, setPuntos] = useState('100')
  const [cierraAt, setCierraAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const puntosNum = Number(puntos)
  const puntosValido = Number.isInteger(puntosNum) && puntosNum >= 0 && puntosNum <= 100000

  function pick(f: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function crear() {
    if (!titulo.trim()) return setError('El título es requerido')
    if (!puntosValido) return setError('Puntos inválidos')
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('titulo', titulo.trim())
      if (descripcion.trim()) fd.set('descripcion', descripcion.trim())
      if (requisitos.trim()) fd.set('requisitos', requisitos.trim())
      fd.set('puntos', String(puntosNum))
      if (cierraAt) fd.set('cierra_at', cierraAt)
      if (file) fd.set('file', file)
      const res = await fetch('/api/retos', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error ?? 'No se pudo crear')
      setLista((prev) => [
        { ...(data.reto as RetoAdmin), participaciones_count: 0, pendientes_count: 0 },
        ...prev,
      ])
      setTitulo('')
      setDescripcion('')
      setRequisitos('')
      setCierraAt('')
      pick(null)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function cerrar(id: string) {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/retos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'CERRADO' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error ?? 'No se pudo cerrar')
      setLista((prev) => prev.map((r) => (r.id === id ? { ...r, estado: 'CERRADO' } : r)))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este reto y sus participaciones?')) return
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/retos/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error ?? 'No se pudo eliminar')
      setLista((prev) => prev.filter((r) => r.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  const inputCls =
    'border border-border rounded-md px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm'

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-graphite">Nuevo reto</h2>
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="w-full aspect-[16/7] object-cover rounded-lg bg-surface" />
            <button
              type="button"
              onClick={() => {
                pick(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white text-lg leading-none"
              aria-label="Quitar imagen"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted hover:border-electric hover:text-electric transition-colors"
          >
            Subir imagen (opcional)
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <input
          className={inputCls}
          placeholder="Título del reto (ej: Visita 3 veces este mes)"
          maxLength={120}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className={inputCls + ' resize-y'}
          rows={2}
          maxLength={2000}
          placeholder="Descripción…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Requisitos / cómo cumplirlo (opcional)"
          maxLength={500}
          value={requisitos}
          onChange={(e) => setRequisitos(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Puntos al cumplir
            <input
              type="number"
              min={0}
              max={100000}
              className={inputCls}
              value={puntos}
              onChange={(e) => setPuntos(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Cierra (opcional)
            <input
              type="datetime-local"
              className={inputCls}
              value={cierraAt}
              onChange={(e) => setCierraAt(e.target.value)}
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={crear} disabled={saving || !puntosValido}>
            {saving ? 'Creando…' : 'Crear reto'}
          </Button>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay retos.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow-card overflow-hidden">
              {r.imagen_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.imagen_url} alt="" className="w-full aspect-[16/6] object-cover bg-surface" />
              )}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-graphite truncate">{r.titulo}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {r.puntos} pts · {r.participaciones_count} participaciones
                      {r.pendientes_count > 0 && (
                        <span className="text-electric font-medium"> · {r.pendientes_count} por revisar</span>
                      )}
                      {r.cierra_at && ` · cierra ${dateFmt.format(new Date(r.cierra_at))}`}
                    </p>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ' +
                      (r.estado === 'ABIERTO' ? 'bg-electric/10 text-electric' : 'bg-surface text-muted')
                    }
                  >
                    {r.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/retos/${r.id}`}>
                    <Button variant="secondary">Revisar participaciones</Button>
                  </Link>
                  {r.estado === 'ABIERTO' && (
                    <Button variant="secondary" onClick={() => cerrar(r.id)} disabled={busy === r.id}>
                      Cerrar
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => eliminar(r.id)} disabled={busy === r.id}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
