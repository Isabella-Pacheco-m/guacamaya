'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { Lanzamiento, LanzamientoEstado } from '@/lib/lanzamientos'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const ESTADO_META: Record<LanzamientoEstado, { label: string; cls: string }> = {
  teaser: { label: 'Expectativa', cls: 'bg-amber-100 text-amber-700' },
  activo: { label: 'Revelado', cls: 'bg-electric/10 text-electric' },
  finalizado: { label: 'Finalizado', cls: 'bg-surface text-muted' },
}

export function LanzamientosAdminPanel({ initial }: { initial: Lanzamiento[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lista, setLista] = useState(initial)

  const [titulo, setTitulo] = useState('')
  const [teaser, setTeaser] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [estado, setEstado] = useState<'teaser' | 'activo'>('teaser')
  const [revelaAt, setRevelaAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  function pickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function crear() {
    if (!titulo.trim()) {
      setError('El título es requerido')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('titulo', titulo.trim())
      if (teaser.trim()) fd.set('teaser', teaser.trim())
      if (descripcion.trim()) fd.set('descripcion', descripcion.trim())
      if (ctaUrl.trim()) fd.set('cta_url', ctaUrl.trim())
      if (ctaLabel.trim()) fd.set('cta_label', ctaLabel.trim())
      fd.set('estado', estado)
      if (revelaAt) fd.set('revela_at', revelaAt)
      if (file) fd.set('file', file)
      const res = await fetch('/api/lanzamientos', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo crear')
        return
      }
      setLista((prev) => [data.lanzamiento as Lanzamiento, ...prev])
      setTitulo('')
      setTeaser('')
      setDescripcion('')
      setCtaUrl('')
      setCtaLabel('')
      setRevelaAt('')
      pickFile(null)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function cambiarEstado(id: string, nuevo: LanzamientoEstado) {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/lanzamientos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo actualizar')
        return
      }
      setLista((prev) => prev.map((l) => (l.id === id ? (data.lanzamiento as Lanzamiento) : l)))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setBusy(null)
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este lanzamiento?')) return
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/lanzamientos/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo eliminar')
        return
      }
      setLista((prev) => prev.filter((l) => l.id !== id))
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
      {/* Crear */}
      <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-graphite">Nuevo lanzamiento</h2>

        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="w-full aspect-[16/7] object-cover rounded-lg bg-surface" />
            <button
              type="button"
              onClick={() => {
                pickFile(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white text-lg leading-none"
              aria-label="Quitar banner"
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
            Subir banner (opcional · 16:7)
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <input
          className={inputCls}
          placeholder="Título del producto"
          maxLength={120}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className={inputCls + ' resize-y'}
          rows={2}
          maxLength={500}
          placeholder="Texto de expectativa (se ve durante el teaser)…"
          value={teaser}
          onChange={(e) => setTeaser(e.target.value)}
        />
        <textarea
          className={inputCls + ' resize-y'}
          rows={3}
          maxLength={3000}
          placeholder="Descripción completa (se revela al final)…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder="Texto del botón (ej: Reservar)"
            maxLength={40}
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Enlace del botón (https://…)"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Modo
            <select
              className={inputCls}
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'teaser' | 'activo')}
            >
              <option value="teaser">Expectativa (con cuenta regresiva)</option>
              <option value="activo">Revelar de una vez</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Fecha de revelado {estado === 'teaser' ? '(recomendado)' : '(opcional)'}
            <input
              type="datetime-local"
              className={inputCls}
              value={revelaAt}
              onChange={(e) => setRevelaAt(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={crear} disabled={saving}>
            {saving ? 'Publicando…' : 'Publicar lanzamiento'}
          </Button>
        </div>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay lanzamientos.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((l) => {
            const meta = ESTADO_META[l.estado]
            return (
              <div key={l.id} className="bg-white rounded-lg shadow-card overflow-hidden">
                {l.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.banner_url} alt="" className="w-full aspect-[16/6] object-cover bg-surface" />
                )}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-graphite truncate">{l.titulo}</p>
                      {l.revela_at && (
                        <p className="text-xs text-muted mt-0.5">
                          Revela: {dateFmt.format(new Date(l.revela_at))}
                        </p>
                      )}
                    </div>
                    <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ' + meta.cls}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {l.estado !== 'activo' && (
                      <Button variant="secondary" onClick={() => cambiarEstado(l.id, 'activo')} disabled={busy === l.id}>
                        Revelar ahora
                      </Button>
                    )}
                    {l.estado !== 'teaser' && (
                      <Button variant="secondary" onClick={() => cambiarEstado(l.id, 'teaser')} disabled={busy === l.id}>
                        Volver a expectativa
                      </Button>
                    )}
                    {l.estado !== 'finalizado' && (
                      <Button variant="secondary" onClick={() => cambiarEstado(l.id, 'finalizado')} disabled={busy === l.id}>
                        Finalizar
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => eliminar(l.id)} disabled={busy === l.id}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
