'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

// Caja de publicación para el miembro en el feed de la PWA. Colapsada muestra
// un "Comparte algo…"; al abrir, textarea + imagen opcional. POST a
// /api/me/feed (gated por el permiso que activa el admin).
export function FeedComposer({
  miembroNombre,
  miembroAvatarUrl,
}: {
  miembroNombre: string
  miembroAvatarUrl?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cuerpo, setCuerpo] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function publish() {
    const text = cuerpo.trim()
    if (!text) {
      setError('Escribe algo para publicar')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('cuerpo', text)
      if (file) fd.set('file', file)
      const res = await fetch('/api/me/feed', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo publicar')
        return
      }
      setCuerpo('')
      setFile(null)
      setOpen(false)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-lg shadow-card px-4 py-3.5 flex items-center gap-3 text-left text-sm text-muted hover:bg-surface/40 transition-colors"
      >
        <Avatar name={miembroNombre} src={miembroAvatarUrl} size={32} />
        Comparte algo con la comunidad…
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-card p-4 flex flex-col gap-3">
      <textarea
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        rows={3}
        maxLength={2000}
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        placeholder="¿Qué quieres compartir?"
        className="border border-border rounded-md px-3 py-2 text-sm resize-y outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-graphite file:text-lime file:px-4 file:py-2 file:text-xs file:font-medium"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="text-sm text-muted hover:text-graphite px-2"
        >
          Cancelar
        </button>
        <Button onClick={publish} disabled={saving}>
          {saving ? 'Publicando…' : 'Publicar'}
        </Button>
      </div>
    </div>
  )
}
