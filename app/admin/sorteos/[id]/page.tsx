import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { getSorteo, listParticipaciones } from '@/lib/sorteos'
import { SorteoDetailPanel } from '@/components/admin/SorteoDetailPanel'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SorteoAdminDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.sorteos_enabled) redirect('/admin/funcionalidades')
  if (!UUID_RE.test(params.id)) notFound()

  const [sorteo, participaciones] = await Promise.all([
    getSorteo(tenantId, params.id),
    listParticipaciones(tenantId, params.id),
  ])
  if (!sorteo) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/sorteos" className="text-xs text-electric hover:underline">
          ← Sorteos
        </Link>
        <h1 className="text-[44px] font-light tracking-tight leading-tight mt-1">
          {sorteo.titulo}
        </h1>
      </div>
      <SorteoDetailPanel sorteo={sorteo} participaciones={participaciones} />
    </div>
  )
}
