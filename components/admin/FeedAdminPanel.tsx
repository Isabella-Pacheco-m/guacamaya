'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { FeedPost } from '@/types'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

export function FeedAdminPanel({ initial }: { initial: FeedPost[] }) {
  const router = useRouter()
  const [posts, setPosts] = useState<FeedPost[]>(initial)
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTitulo('')
    setCuerpo('')
    setLinkUrl('')
    setLinkLabel('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function publish() {
    setError(null)
    if (titulo.trim().length === 0) {
      setError('Agrega un título')
      return
    }
    if (cuerpo.trim().length === 0) {
      setError('Agrega un cuerpo')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.set('titulo', titulo.trim())
      fd.set('cuerpo', cuerpo.trim())
      if (linkUrl.trim()) fd.set('link_url', linkUrl.trim())
      if (linkLabel.trim()) fd.set('link_label', linkLabel.trim())
      if (file) fd.set('file', file)

      const res = await fetch('/api/feed', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo publicar')
        return
      }
      setPosts((prev) => [data.post, ...prev])
      reset()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta publicación?')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/feed/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo eliminar')
        return
      }
      setPosts((prev) => prev.filter((p) => p.id !== id))
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
        <h2 className="text-sm font-medium">Publicar</h2>
        <input
          type="text"
          placeholder="Título"
          maxLength={120}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
        />
        <textarea
          placeholder="Cuéntale a tu comunidad…"
          maxLength={2000}
          rows={4}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-electric"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="url"
            placeholder="Link (opcional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
          />
          <input
            type="text"
            placeholder='Texto del botón (ej: "Ver más")'
            maxLength={60}
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-electric"
          />
        </div>
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
            {saving ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-card p-12 text-center text-muted text-sm">
            Aún no has publicado nada.
          </div>
        ) : (
          posts.map((p) => (
            <article
              key={p.id}
              className="bg-white rounded-lg shadow-card overflow-hidden"
            >
              {p.imagen_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imagen_url}
                  alt=""
                  className="w-full max-h-72 object-cover"
                />
              )}
              <div className="p-5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-medium">{p.titulo}</h3>
                    <p className="text-[11px] text-muted mt-0.5">
                      {dateFmt.format(new Date(p.created_at))}
                      {p.autor_email && ` · ${p.autor_email}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={saving}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
                <p className="text-sm text-graphite whitespace-pre-wrap">
                  {p.cuerpo}
                </p>
                {p.link_url && (
                  <a
                    href={p.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-electric text-sm hover:underline self-start"
                  >
                    {p.link_label || p.link_url} →
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
