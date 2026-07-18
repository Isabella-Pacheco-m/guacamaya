import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { getReto, listRetoParticipaciones } from '@/lib/retos'
import { RetoDetailPanel } from '@/components/admin/RetoDetailPanel'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function RetoDetailAdminPage({
  params,
}: {
  params: { id: string }
}) {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.retos_enabled) redirect('/admin/funcionalidades')
  if (!UUID_RE.test(params.id)) notFound()

  const [reto, participaciones] = await Promise.all([
    getReto(tenantId, params.id),
    listRetoParticipaciones(tenantId, params.id),
  ])
  if (!reto) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href="/admin/retos" className="text-electric text-xs hover:underline w-fit">
        ← Volver a retos
      </Link>

      <div>
        <h1 className="text-[40px] font-light tracking-tight leading-tight">
          {reto.titulo}
        </h1>
        <p className="text-muted text-sm mt-2">
          {reto.puntos} puntos al cumplir · {reto.cumplidos_count} cumplidos ·{' '}
          {reto.participaciones_count} participaciones ·{' '}
          {reto.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
        </p>
        {reto.descripcion && (
          <p className="text-sm text-graphite/90 mt-3">{reto.descripcion}</p>
        )}
      </div>

      <section>
        <h2 className="text-sm font-medium mb-4">Participaciones</h2>
        <RetoDetailPanel
          participaciones={participaciones}
          puntosDefault={reto.puntos}
        />
      </section>
    </div>
  )
}
