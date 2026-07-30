import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listRetosAdmin } from '@/lib/retos'
import { RetosAdminPanel } from '@/components/admin/RetosAdminPanel'
import { PageHeader } from '@/components/admin/PageHeader'

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
      <PageHeader
        eyebrow="Contenido"
        tone="oliva"
        titulo="Retos"
        descripcion={
          <>
            Metas que tus clientes cumplen subiendo evidencia. Tú verificas
            cada envío y todos los que cumplen ganan los puntos del reto.
          </>
        }
      />
      <RetosAdminPanel initial={retos} />
    </div>
  )
}
