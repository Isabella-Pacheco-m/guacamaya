'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Borrado de recompensa con confirmación inline (en vez de window.confirm)
// para no romper el look del panel. El borrado es definitivo: no aparece más
// en la lista del admin ni en la PWA, pero el historial de canjes se conserva.
export function DeleteRecompensa({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recompensas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Error')
        setConfirming(false)
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
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">¿Borrar?</span>
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-red-600 text-xs font-medium hover:underline disabled:opacity-50"
          >
            {loading ? '...' : 'Sí, borrar'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-muted text-xs hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-red-600 text-xs hover:underline"
        >
          Borrar
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
