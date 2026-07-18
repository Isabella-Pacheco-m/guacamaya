import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listRetosAdmin } from '@/lib/retos'
import { RetosAdminPanel } from '@/components/admin/RetosAdminPanel'

export const dynamic = 'force-dynamic'

export default async function RetosAdminPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.retos_enabled) {
    redirect('/admin/funcionalidades')
  }
  const retos = await listRetosAdmin(tenantId)

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Retos</h1>
        <p className="text-muted text-sm mt-2">
          Metas que tus clientes cumplen subiendo evidencia. Tú verificas cada
          envío y todos los que cumplen ganan los puntos del reto.
        </p>
      </div>
      <RetosAdminPanel initial={retos} />
    </div>
  )
}
