'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreateRecompensaForm() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [costoStr, setCostoStr] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const costo = parseInt(costoStr.replace(/[^\d]/g, ''), 10)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || !nombre.trim() || !Number.isFinite(costo) || costo <= 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/recompensas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          costo_puntos: costo,
          descripcion: descripcion || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear recompensa')
        return
      }
      setNombre('')
      setCostoStr('')
      setDescripcion('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Nombre"
        name="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Café gratis"
        required
        disabled={loading}
      />
      <Input
        label="Costo en puntos"
        name="costo_puntos"
        inputMode="numeric"
        value={costoStr}
        onChange={(e) => setCostoStr(e.target.value)}
        placeholder="100"
        required
        disabled={loading}
      />
      <Input
        label="Descripción (opcional)"
        name="descripcion"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Cualquier café del menú"
        disabled={loading}
        className="sm:col-span-2"
      />
      {error && (
        <div className="sm:col-span-2 text-sm text-red-600">{error}</div>
      )}
      <div className="sm:col-span-2 flex justify-end">
        <Button
          type="submit"
          disabled={loading || !nombre.trim() || !Number.isFinite(costo) || costo <= 0}
        >
          {loading ? 'Creando...' : 'Crear recompensa'}
        </Button>
      </div>
    </form>
  )
}
