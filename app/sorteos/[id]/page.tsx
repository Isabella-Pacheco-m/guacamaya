import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { getSorteo, getMiParticipacion } from '@/lib/sorteos'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { SorteoParticiparForm } from '@/components/pwa/SorteoParticiparForm'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const ESTADO_LABEL: Record<string, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  SORTEADO: 'Con ganador',
}

export default async function SorteoDetailPwaPage({
  params,
}: {
  params: { id: string }
}) {
  const { tenant, miembro } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.sorteos_enabled) redirect('/')
  if (!UUID_RE.test(params.id)) notFound()

  const [sorteo, miParticipacion] = await Promise.all([
    getSorteo(tenant.id, params.id),
    getMiParticipacion(tenant.id, params.id, miembro.id),
  ])
  if (!sorteo) notFound()

  const yaParticipo = miParticipacion !== null
  const esGanador = sorteo.ganador_miembro_id === miembro.id

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 max-w-md mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-6">
          <Link href="/sorteos" className="text-xs text-electric hover:underline">
            ← Sorteos
          </Link>
        </header>

        <article className="bg-white rounded-lg shadow-card overflow-hidden mb-6">
          {sorteo.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sorteo.imagen_url}
              alt=""
              className="w-full max-h-72 object-cover"
            />
          )}
          <div className="p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider bg-electric/10 text-electric rounded-full px-2 py-0.5 font-medium">
                {ESTADO_LABEL[sorteo.estado] ?? sorteo.estado}
              </span>
              {sorteo.cierra_at && (
                <span className="text-xs text-muted">
                  Cierra {dateFmt.format(new Date(sorteo.cierra_at))}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-light leading-tight tracking-tight">
              {sorteo.titulo}
            </h1>
            {sorteo.descripcion && (
              <p className="text-sm text-graphite whitespace-pre-wrap leading-relaxed">
                {sorteo.descripcion}
              </p>
            )}
            {sorteo.requisitos && (
              <div className="bg-surface rounded-md p-4 text-sm mt-2">
                <p className="text-[11px] uppercase tracking-wider text-muted mb-1.5">
                  Para participar
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {sorteo.requisitos}
                </p>
              </div>
            )}
          </div>
        </article>

        {sorteo.estado === 'SORTEADO' ? (
          <Card className="text-center" padding="lg">
            {esGanador ? (
              <>
                <p className="text-[11px] uppercase tracking-wider text-electric font-medium">
                  ¡Felicidades!
                </p>
                <p className="text-xl font-light mt-3 leading-tight">
                  Eres el ganador
                </p>
                <p className="text-sm text-muted mt-2">
                  Acércate al negocio para reclamar tu premio.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Este sorteo ya tiene ganador. ¡Suerte para la próxima!
                </p>
                {sorteo.ganador_nombre && (
                  <p className="text-sm text-graphite mt-2">
                    Ganó:{' '}
                    <span className="font-medium">{sorteo.ganador_nombre}</span>
                  </p>
                )}
              </>
            )}
          </Card>
        ) : sorteo.estado === 'CERRADO' ? (
          <Card className="text-center" padding="lg">
            <p className="text-sm text-muted">
              Este sorteo ya cerró participaciones. Pronto se anuncia el ganador.
            </p>
          </Card>
        ) : yaParticipo ? (
          <Card className="text-center" padding="lg">
            <p className="text-[11px] uppercase tracking-wider text-electric font-medium">
              Ya estás dentro
            </p>
            <p className="text-sm text-graphite mt-2">
              Te confirmamos tu participación. Mucha suerte.
            </p>
          </Card>
        ) : (
          <SorteoParticiparForm sorteoId={sorteo.id} />
        )}

        <Link href="/sorteos" className="block mt-6">
          <Button variant="secondary" className="w-full">
            Ver otros sorteos
          </Button>
        </Link>
      </div>
    </main>
  )
}
