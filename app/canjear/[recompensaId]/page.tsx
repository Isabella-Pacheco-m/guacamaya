import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getRecompensaById } from '@/lib/tenantQueries'
import { canjeQuickUrl } from '@/lib/config'
import { qrSvg } from '@/lib/qr'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'

export const dynamic = 'force-dynamic'

const numFmt = new Intl.NumberFormat('es-CO')
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function CanjearPwaPage({
  params,
}: {
  params: { recompensaId: string }
}) {
  if (!UUID_RE.test(params.recompensaId)) notFound()

  const { tenant, miembro } = await requireCliente()
  const recompensa = await getRecompensaById(tenant.id, params.recompensaId)
  if (!recompensa) notFound()

  const alcanza = miembro.puntos_actuales >= recompensa.costo_puntos
  const activa = recompensa.activa

  if (!activa || !alcanza) {
    return (
      <main className="min-h-screen bg-tenant-halo">
        <div className="px-6 py-10 max-w-md mx-auto">
          <TenantTheme color={tenant.color_primario} />
          <Card className="text-center" padding="lg">
            <h1 className="text-xl font-light mb-3 leading-tight">
              {!activa ? 'Recompensa no disponible' : 'Puntos insuficientes'}
            </h1>
            <p className="text-sm text-muted mb-6">
              {!activa
                ? 'Esta recompensa fue desactivada.'
                : `Te faltan ${numFmt.format(
                    recompensa.costo_puntos - miembro.puntos_actuales,
                  )} puntos.`}
            </p>
            <Link href="/recompensas">
              <Button variant="secondary" className="w-full">
                Volver
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    )
  }

  const url = canjeQuickUrl(miembro.id, recompensa.id)
  const qr = await qrSvg(url)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 max-w-md mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {tenant.nombre}
          </p>
          <h1 className="text-2xl font-light mt-1 leading-tight">
            Muestra este código
          </h1>
          <p className="text-sm text-muted mt-2">
            El personal lo escaneará para procesar tu canje.
          </p>
        </header>

        <Card className="mb-4" padding="lg">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Canjeas
            </p>
            <p className="text-lg font-medium mt-1">{recompensa.nombre}</p>
            <p className="text-3xl font-light mt-3 tabular-nums leading-none">
              {numFmt.format(recompensa.costo_puntos)}
            </p>
            <p className="text-xs text-muted mt-1">puntos</p>
          </div>
        </Card>

        <Card className="mb-6" padding="lg">
          <div
            className="mx-auto"
            style={{ width: 240, height: 240 }}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="text-[11px] text-muted text-center mt-4 tracking-wider uppercase">
            {miembro.id.slice(0, 8)} · {recompensa.id.slice(0, 8)}
          </p>
        </Card>

        <p className="text-xs text-muted text-center mb-6">
          Tu saldo después del canje será{' '}
          <span className="tabular-nums text-graphite">
            {numFmt.format(miembro.puntos_actuales - recompensa.costo_puntos)}
          </span>{' '}
          puntos.
        </p>

        <Link href="/recompensas" className="block">
          <Button variant="secondary" className="w-full">
            Cancelar
          </Button>
        </Link>
      </div>
    </main>
  )
}
