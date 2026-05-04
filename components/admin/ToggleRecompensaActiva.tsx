'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ToggleRecompensaActiva({
  id,
  activa,
}: {
  id: string
  activa: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recompensas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: !activa }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Error')
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={loading}
        className="text-electric text-xs hover:underline disabled:opacity-50"
      >
        {loading ? '...' : activa ? 'Desactivar' : 'Activar'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
