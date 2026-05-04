'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function SorteoParticiparForm({ sorteoId }: { sorteoId: string }) {
  const router = useRouter()
  const [comentario, setComentario] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit() {
    setError(null)
    setSaving(true)
    try {
      const fd = new FormData()
      if (comentario.trim()) fd.set('comentario', comentario.trim())
      if (file) fd.set('file', file)
      const res = await fetch(`/api/me/sorteos/${sorteoId}/participar`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo participar')
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-card p-6 flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-electric font-medium">
          Participar
        </p>
        <h3 className="text-lg font-light leading-tight mt-1">
          Suma tu nombre al sombrero
        </h3>
      </div>
      <textarea
        placeholder="Comentario (opcional)"
        maxLength={500}
        rows={3}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        className="border border-border bg-surface rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric transition-colors"
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Foto de evidencia (opcional)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-graphite file:text-lime file:px-4 file:py-2 file:text-xs file:font-medium hover:file:bg-graphite/90 transition-colors cursor-pointer"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? 'Enviando…' : 'Quiero participar'}
      </Button>
    </div>
  )
}
