'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Suscripcion } from '@/types'

// Panel de suscripción del negocio: estado del periodo, renovación (nuevo
// checkout de Wompi) y desuscripción. Cancelar es destructivo — pierde el
// acceso a la cuenta — así que pide una confirmación explícita en dos pasos.

const fechaCo = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'long',
})

function EstadoBadge({ estado }: { estado: Suscripcion['estado'] }) {
  const estilos: Record<Suscripcion['estado'], string> = {
    ACTIVA: 'bg-lime/30 text-graphite border-lime/50',
    PENDIENTE: 'bg-sky/20 text-electric border-sky/40',
    RECHAZADA: 'bg-red-50 text-red-600 border-red-100',
    CANCELADA: 'bg-red-50 text-red-600 border-red-100',
  }
  const labels: Record<Suscripcion['estado'], string> = {
    ACTIVA: 'Activa',
    PENDIENTE: 'Pago pendiente',
    RECHAZADA: 'Pago rechazado',
    CANCELADA: 'Cancelada',
  }
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${estilos[estado]}`}
    >
      {labels[estado]}
    </span>
  )
}

export function SuscripcionPanel({
  ultima,
  pagadaHasta,
}: {
  ultima: Suscripcion | null
  pagadaHasta: string | null
}) {
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vencida =
    pagadaHasta !== null && new Date(pagadaHasta).getTime() < Date.now()

  async function renovar() {
    setError(null)
    setOcupado(true)
    try {
      const res = await fetch('/api/tenant/suscripcion/renovar', {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'No pudimos iniciar el pago.')
        setOcupado(false)
        return
      }
      const url = String(json.checkoutUrl ?? '')
      if (!url.startsWith('https://checkout.wompi.co/')) {
        setError('Respuesta de pago inválida. Intenta de nuevo.')
        setOcupado(false)
        return
      }
      window.location.href = url
    } catch {
      setError('No pudimos iniciar el pago. Intenta de nuevo.')
      setOcupado(false)
    }
  }

  async function cancelar() {
    setError(null)
    setOcupado(true)
    try {
      const res = await fetch('/api/tenant/suscripcion/cancelar', {
        method: 'POST',
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'No pudimos cancelar la suscripción.')
        setOcupado(false)
        return
      }
      // La cuenta queda sin acceso: cerrar la sesión de una vez.
      window.location.href = '/api/auth/logout'
    } catch {
      setError('No pudimos cancelar la suscripción. Intenta de nuevo.')
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-medium mb-1">Estado</h2>
            {ultima ? (
              <p className="text-sm text-muted">
                {ultima.negocio} · {ultima.email}
              </p>
            ) : (
              <p className="text-sm text-muted">
                Tu cuenta no tiene una suscripción registrada. Si pagas mes a
                mes por otro medio, esto no afecta tu acceso.
              </p>
            )}
          </div>
          {ultima && <EstadoBadge estado={ultima.estado} />}
        </div>

        {pagadaHasta && (
          <p className="text-sm mb-4">
            {vencida ? (
              <>
                Tu periodo pagado terminó el{' '}
                <span className="font-medium">
                  {fechaCo.format(new Date(pagadaHasta))}
                </span>
                . Renueva para mantener tu club al día.
              </>
            ) : (
              <>
                Periodo pagado hasta el{' '}
                <span className="font-medium">
                  {fechaCo.format(new Date(pagadaHasta))}
                </span>
                .
              </>
            )}
          </p>
        )}

        {ultima?.estado === 'PENDIENTE' && (
          <p className="text-sm text-muted mb-4">
            Hay un pago en proceso. Cuando Wompi lo confirme, el periodo se
            actualizará solo.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <Button onClick={renovar} disabled={ocupado}>
          {ocupado ? 'Un momento…' : 'Pagar mes · $35.000'}
        </Button>

        {/* El pago corre por Wompi; el tratamiento de esos datos es de ellos. */}
        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          Pagos procesados por Wompi bajo su{' '}
          <a
            href="https://wompi.com/es/co/tratamiento-datos-personales"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            política de tratamiento de datos
          </a>
          .
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-medium mb-1">Desuscribirse</h2>
        <p className="text-sm text-muted leading-relaxed mb-5">
          Al cancelar tu suscripción{' '}
          <span className="text-graphite font-medium">
            pierdes el acceso a tu cuenta
          </span>{' '}
          y al panel de tu club. Tus clientes dejarán de poder usar el club.
          Para volver tendrás que suscribirte de nuevo.
        </p>

        {confirmando ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="danger" onClick={cancelar} disabled={ocupado}>
              {ocupado ? 'Cancelando…' : 'Sí, cancelar y perder acceso'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirmando(false)}
              disabled={ocupado}
            >
              No, conservar mi club
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmando(true)}>
            Cancelar suscripción
          </Button>
        )}
      </Card>
    </div>
  )
}
