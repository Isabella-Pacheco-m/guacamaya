import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listSorteosAdmin } from '@/lib/sorteos'
import { SorteosAdminList } from '@/components/admin/SorteosAdminList'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function SorteosAdminPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.sorteos_enabled) redirect('/admin/funcionalidades')

  const sorteos = await listSorteosAdmin(tenantId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Contenido"
        tone="oliva"
        titulo="Sorteos"
        descripcion="Crea sorteos y elige al ganador entre los participantes."
      />
      <SorteosAdminList initial={sorteos} />
    </div>
  )
}
