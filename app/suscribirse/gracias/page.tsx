import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { consultarTransaccion } from '@/lib/wompi'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gracias — Guacamaya',
}

// Retorno del checkout (?id=<transaction_id>). Solo pinta el estado — la
// activación real la hace el webhook verificado.
export default async function GraciasPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  const tx = searchParams.id
    ? await consultarTransaccion(searchParams.id)
    : null

  let titulo = 'No encontramos tu pago'
  let cuerpo =
    'No pudimos consultar el estado de la transacción. Si el pago fue descontado, escríbenos y lo revisamos.'
  let aprobado = false
  let pendiente = false

  if (tx?.status === 'APPROVED') {
    aprobado = true
    titulo = '¡Pago recibido!'
    cuerpo =
      'Tu suscripción quedó registrada. Una persona de Guacamaya se comunicará contigo muy pronto para acompañarte en la creación de tu club y darte acceso a la plataforma.'
  } else if (tx?.status === 'PENDING') {
    pendiente = true
    titulo = 'Pago en proceso'
    cuerpo =
      'Tu pago está siendo procesado por Wompi. Apenas se confirme, un administrador se comunicará contigo para darte acceso a la plataforma.'
  } else if (tx) {
    titulo = 'El pago no se completó'
    cuerpo =
      'Wompi no aprobó la transacción. No se realizó ningún cobro — puedes intentarlo de nuevo.'
  }

  return (
    <main className="min-h-screen bg-tenant-halo bg-paper flex items-center justify-center px-6 py-14">
      <div className="max-w-md w-full">
        <Link href="/" className="flex justify-center mb-8">
          <Image
            src="/logo-light.png"
            alt="Guacamaya"
            width={180}
            height={77}
            priority
            className="h-auto w-[150px]"
          />
        </Link>

        <Card className="text-center">
          <span
            className={
              'mx-auto mb-5 grid place-items-center h-14 w-14 rounded-full text-2xl ' +
              (aprobado
                ? 'bg-lime text-graphite'
                : pendiente
                  ? 'bg-sky/30 text-electric'
                  : 'bg-red-50 text-red-500')
            }
          >
            {aprobado ? '✓' : pendiente ? '…' : '✕'}
          </span>

          <h1 className="text-2xl font-light mb-3">{titulo}</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">{cuerpo}</p>

          {tx && (
            <p className="text-[11px] text-muted mb-6">
              Referencia: <span className="tabular-nums">{tx.reference}</span>
            </p>
          )}

          {aprobado || pendiente ? (
            <Link href="/">
              <Button variant="secondary" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          ) : (
            <Link href="/suscribirse">
              <Button className="w-full">Intentar de nuevo</Button>
            </Link>
          )}
        </Card>

        <p className="text-[11px] text-muted text-center mt-5 leading-relaxed">
          El pago fue procesado por Wompi bajo su{' '}
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
      </div>
    </main>
  )
}
