'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Formulario de suscripción: el servidor firma el intento de pago y devuelve
// la URL del Web Checkout de Wompi. Acá no se toca ningún secreto.
export function SuscribirseForm() {
  const [nombre, setNombre] = useState('')
  const [negocio, setNegocio] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const res = await fetch('/api/suscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          negocio,
          email,
          telefono: telefono || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'No pudimos iniciar el pago. Intenta de nuevo.')
        setEnviando(false)
        return
      }
      // Solo se redirige al checkout oficial de Wompi.
      const url = String(json.checkoutUrl ?? '')
      if (!url.startsWith('https://checkout.wompi.co/')) {
        setError('Respuesta de pago inválida. Intenta de nuevo.')
        setEnviando(false)
        return
      }
      window.location.href = url
    } catch {
      setError('No pudimos iniciar el pago. Revisa tu conexión e intenta de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        name="nombre"
        label="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        maxLength={80}
        autoComplete="name"
      />
      <Input
        name="negocio"
        label="Nombre de tu negocio"
        value={negocio}
        onChange={(e) => setNegocio(e.target.value)}
        required
        maxLength={80}
        autoComplete="organization"
      />
      <Input
        name="email"
        type="email"
        label="Correo"
        hint="Con este correo entrarás al panel de tu club."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        maxLength={120}
        autoComplete="email"
      />
      <Input
        name="telefono"
        type="tel"
        label="Teléfono (opcional)"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        autoComplete="tel"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      <Button type="submit" disabled={enviando} className="w-full mt-2">
        {enviando ? 'Llevándote al pago…' : 'Pagar $35.000 y crear mi club'}
      </Button>

      {/* La política de tratamiento de datos del pago es de Wompi — nosotros
          no vemos ni guardamos datos de tarjetas ni medios de pago. */}
      <p className="text-[11px] text-muted leading-relaxed text-center">
        El pago se procesa de forma segura a través de{' '}
        <span className="text-graphite">Wompi</span>. Los datos que ingreses al
        pagar se rigen por la{' '}
        <a
          href="https://wompi.com/es/co/tratamiento-datos-personales"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-electric"
        >
          política de tratamiento de datos de Wompi
        </a>
        .
      </p>
    </form>
  )
}
