'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { SorteoConMeta } from '@/types'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const ESTADO_LABEL: Record<SorteoConMeta['estado'], string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  SORTEADO: 'Con ganador',
}

export function SorteosAdminList({ initial }: { initial: SorteoConMeta[] }) {
  const router = useRouter()
  const [sorteos, setSorteos] = useState(initial)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [requisitos, setRequisitos] = useState('')
  const [cierraAt, setCierraAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTitulo('')
    setDescripcion('')
    setRequisitos('')
    setCierraAt('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function publish() {
    setError(null)
    if (titulo.trim().length === 0) {
      setError('Agrega un título')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.set('titulo', titulo.trim())
      if (descripcion.trim()) fd.set('descripcion', descripcion.trim())
      if (requisitos.trim()) fd.set('requisitos', requisitos.trim())
      if (cierraAt) fd.set('cierra_at', cierraAt)
      if (file) fd.set('file', file)

      const res = await fetch('/api/sorteos', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo crear')
        return
      }
      setSorteos((prev) => [
        { ...data.sorteo, participaciones_count: 0 },
        ...prev,
      ])
      reset()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este sorteo y sus participaciones?')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/sorteos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo eliminar')
        return
      }
      setSorteos((prev) => prev.filter((s) => s.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-3">
        <h2 className="text-sm font-medium">Crear sorteo</h2>
        <input
          type="text"
          placeholder="Título"
          maxLength={120}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
        />
        <textarea
          placeholder="Descripción (opcional)"
          maxLength={2000}
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-electric"
        />
        <textarea
          placeholder='Requisitos para participar (ej: "Sube foto de tu factura")'
          maxLength={500}
          rows={2}
          value={requisitos}
          onChange={(e) => setRequisitos(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-electric"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Cierre (opcional)</span>
          <input
            type="datetime-local"
            value={cierraAt}
            onChange={(e) => setCierraAt(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
          />
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-graphite file:text-lime file:px-4 file:py-2 file:text-xs file:font-medium"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={publish} disabled={saving}>
            {saving ? 'Creando…' : 'Crear sorteo'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sorteos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-card p-12 text-center text-muted text-sm">
            Aún no has creado sorteos.
          </div>
        ) : (
          sorteos.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-lg shadow-card p-5 flex items-start gap-4"
            >
              {s.imagen_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.imagen_url}
                  alt=""
                  className="h-20 w-20 rounded-md object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-medium truncate">{s.titulo}</h3>
                  <span className="text-[10px] uppercase tracking-wide bg-surface text-muted border border-border rounded-full px-2 py-0.5">
                    {ESTADO_LABEL[s.estado]}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {dateFmt.format(new Date(s.created_at))} ·{' '}
                  {s.participaciones_count}{' '}
                  {s.participaciones_count === 1 ? 'participación' : 'participaciones'}
                </p>
                {s.cierra_at && (
                  <p className="text-xs text-muted mt-0.5">
                    Cierra: {dateFmt.format(new Date(s.cierra_at))}
                  </p>
                )}
                {s.ganador_nombre && (
                  <p className="text-xs text-graphite mt-1">
                    Ganador: <span className="font-medium">{s.ganador_nombre}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Link
                  href={`/admin/sorteos/${s.id}`}
                  className="text-electric text-xs hover:underline"
                >
                  Ver detalle →
                </Link>
                <button
                  onClick={() => remove(s.id)}
                  disabled={saving}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
