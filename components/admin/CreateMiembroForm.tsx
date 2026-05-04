'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreateMiembroForm() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/miembros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono: telefono || undefined,
          email: email || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear miembro')
        return
      }
      setNombre('')
      setTelefono('')
      setEmail('')
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
        placeholder="María Pérez"
        required
        disabled={loading}
      />
      <Input
        label="Teléfono"
        name="telefono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="573001234567"
        hint="Formato E.164"
        disabled={loading}
      />
      <Input
        label="Email (opcional)"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="maria@ejemplo.com"
        disabled={loading}
        className="sm:col-span-2"
      />
      {error && (
        <div className="sm:col-span-2 text-sm text-red-600">{error}</div>
      )}
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={loading || !nombre.trim()}>
          {loading ? 'Creando...' : 'Crear miembro'}
        </Button>
      </div>
    </form>
  )
}
