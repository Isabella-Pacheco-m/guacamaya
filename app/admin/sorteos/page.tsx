import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listSorteosAdmin } from '@/lib/sorteos'
import { SorteosAdminList } from '@/components/admin/SorteosAdminList'

export const dynamic = 'force-dynamic'

export default async function SorteosAdminPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.sorteos_enabled) redirect('/admin/funcionalidades')

  const sorteos = await listSorteosAdmin(tenantId)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Sorteos</h1>
        <p className="text-muted text-sm mt-2">
          Crea sorteos y elige al ganador entre los participantes.
        </p>
      </div>
      <SorteosAdminList initial={sorteos} />
    </div>
  )
}
