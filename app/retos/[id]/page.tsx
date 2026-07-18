import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { getReto, getMiParticipacionReto } from '@/lib/retos'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { RetoParticiparForm } from '@/components/pwa/RetoParticiparForm'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function RetoDetailPwaPage({
  params,
}: {
  params: { id: string }
}) {
  const { tenant, miembro } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.retos_enabled) redirect('/')
  if (!UUID_RE.test(params.id)) notFound()

  const [reto, participacion] = await Promise.all([
    getReto(tenant.id, params.id),
    getMiParticipacionReto(tenant.id, params.id, miembro.id),
  ])
  if (!reto) notFound()

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <Link href="/retos" className="text-xs text-electric hover:underline">
          ← Retos
        </Link>

        <article className="mt-3 bg-white rounded-2xl shadow-card overflow-hidden">
          {reto.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reto.imagen_url} alt="" className="w-full aspect-[16/9] object-cover" />
          )}
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={
                  'text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-medium ' +
                  (reto.estado === 'ABIERTO' ? 'bg-electric/10 text-electric' : 'bg-surface text-muted')
                }
              >
                {reto.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
              </span>
              {reto.puntos > 0 && (
                <span className="text-[11px] font-medium text-graphite bg-lime/40 rounded-full px-2 py-0.5">
                  +{reto.puntos} pts al cumplir
                </span>
              )}
            </div>
            <h1 className="text-2xl font-light leading-tight tracking-tight">{reto.titulo}</h1>
            {reto.descripcion && (
              <p className="text-[15px] text-graphite/90 whitespace-pre-wrap leading-relaxed">
                {reto.descripcion}
              </p>
            )}
            {reto.requisitos && (
              <div className="rounded-md bg-surface px-3 py-2 text-sm text-graphite/80">
                <span className="font-medium">Cómo cumplirlo: </span>
                {reto.requisitos}
              </div>
            )}
          </div>
        </article>

        <div className="mt-4">
          <RetoParticiparForm
            retoId={reto.id}
            abierto={reto.estado === 'ABIERTO'}
            participacion={participacion}
          />
        </div>

        <Link href="/" className="mt-8 block">
          <Button variant="secondary" className="w-full">
            Inicio
          </Button>
        </Link>
      </div>
    </main>
  )
}
