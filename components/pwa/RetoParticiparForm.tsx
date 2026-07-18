'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { RetoPartEstado } from '@/lib/retos'

const ESTADO_META: Record<RetoPartEstado, { label: string; cls: string; hint: string }> = {
  pendiente: {
    label: 'En revisión',
    cls: 'bg-amber-100 text-amber-700',
    hint: 'El negocio está revisando tu evidencia.',
  },
  cumplido: {
    label: '¡Cumplido!',
    cls: 'bg-lime/40 text-graphite',
    hint: 'Ganaste los puntos de este reto.',
  },
  rechazado: {
    label: 'No aprobado',
    cls: 'bg-red-50 text-red-600',
    hint: 'Tu evidencia no fue aprobada esta vez.',
  },
}

export function RetoParticiparForm({
  retoId,
  abierto,
  participacion,
}: {
  retoId: string
  abierto: boolean
  participacion: { estado: RetoPartEstado; puntos_otorgados: number } | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (participacion) {
    const meta = ESTADO_META[participacion.estado]
    return (
      <div className="bg-white rounded-lg shadow-card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-graphite">Ya participaste</p>
          <p className="text-xs text-muted mt-0.5">
            {meta.hint}
            {participacion.estado === 'cumplido' && participacion.puntos_otorgados > 0
              ? ` +${participacion.puntos_otorgados} pts`
              : ''}
          </p>
        </div>
        <span className={'shrink-0 rounded-full px-3 py-1 text-xs font-medium ' + meta.cls}>
          {meta.label}
        </span>
      </div>
    )
  }

  if (!abierto) {
    return (
      <div className="bg-white rounded-lg shadow-card p-4 text-sm text-muted text-center">
        Este reto ya no acepta participaciones.
      </div>
    )
  }

  function pick(f: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function enviar() {
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      if (file) fd.set('file', file)
      if (comentario.trim()) fd.set('comentario', comentario.trim())
      const res = await fetch(`/api/me/retos/${retoId}/participar`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar')
        return
      }
      pick(null)
      setComentario('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-card p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-graphite">Sube tu evidencia</p>
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="w-full aspect-square object-cover rounded-xl bg-surface" />
          <button
            type="button"
            onClick={() => {
              pick(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
            className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white text-lg leading-none"
            aria-label="Quitar foto"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted hover:border-electric hover:text-electric transition-colors"
        >
          Adjuntar foto (opcional)
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <textarea
        rows={2}
        maxLength={500}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Cuéntanos cómo lo cumpliste (opcional)…"
        className="border border-border rounded-md px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={enviar} disabled={saving}>
          {saving ? 'Enviando…' : 'Participar'}
        </Button>
      </div>
    </div>
  )
}
