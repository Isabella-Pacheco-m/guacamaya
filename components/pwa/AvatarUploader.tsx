'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'

// Foto de perfil del cliente en la PWA. Muestra el avatar (foto o iniciales) con
// un botón de cámara superpuesto; al elegir archivo sube a /api/me/avatar y
// refresca. Long-press / segundo botón permite quitarla.
export function AvatarUploader({
  nombre,
  initialUrl,
  size = 64,
}: {
  nombre: string
  initialUrl: string | null
  size?: number
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(file: File) {
    setError(null)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/me/avatar', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo subir la foto')
        return
      }
      setUrl(data.miembro?.avatar_url ?? null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onRemove() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/me/avatar', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo quitar la foto')
        return
      }
      setUrl(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <Avatar name={nombre} src={url} size={size} ring />
        {loading && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
            <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
          </span>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          aria-label={url ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
          className="absolute -bottom-0.5 -right-0.5 h-7 w-7 grid place-items-center rounded-full bg-graphite text-lime shadow-md ring-2 ring-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <CameraIcon className="h-3.5 w-3.5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPick(f)
          }}
        />
      </div>
      {url && !loading && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] text-muted hover:text-graphite transition-colors"
        >
          Quitar foto
        </button>
      )}
      {error && <p className="text-[11px] text-red-600 text-center max-w-[10rem]">{error}</p>}
    </div>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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
