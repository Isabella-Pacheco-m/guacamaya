'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

// Subida de foto del miembro a la galería. Elige imagen → vista previa →
// caption opcional → enviar. Queda pendiente de aprobación del negocio.
export function GaleriaComposer({ puntos }: { puntos: number }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function pick(f: File | null) {
    setError(null)
    setOk(false)
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setCaption('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function enviar() {
    if (!file) {
      setError('Elige una foto')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      if (caption.trim()) fd.set('caption', caption.trim())
      const res = await fetch('/api/me/galeria', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar')
        return
      }
      reset()
      setOk(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-card p-4 flex flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="w-full aspect-square object-cover rounded-xl bg-surface"
          />
          <button
            type="button"
            onClick={reset}
            aria-label="Quitar foto"
            className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border py-10 flex flex-col items-center gap-2 text-muted hover:border-electric hover:text-electric transition-colors"
        >
          <CameraIcon className="h-7 w-7" />
          <span className="text-sm font-medium">Sube una foto</span>
          {puntos > 0 && (
            <span className="text-xs">
              Gana <span className="font-medium">{puntos} puntos</span> si se aprueba
            </span>
          )}
        </button>
      )}

      {preview && (
        <>
          <textarea
            rows={2}
            maxLength={300}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Añade un texto (opcional)…"
            className="border border-border rounded-md px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              Tu foto pasa a revisión del negocio.
            </span>
            <Button onClick={enviar} disabled={saving}>
              {saving ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </>
      )}

      {ok && (
        <p className="text-xs text-graphite bg-lime/30 border border-lime/40 rounded-md px-3 py-2">
          ¡Enviada! Te avisamos cuando el negocio la apruebe.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
