import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listLanzamientosAdmin } from '@/lib/lanzamientos'
import { LanzamientosAdminPanel } from '@/components/admin/LanzamientosAdminPanel'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function LanzamientosAdminPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.lanzamientos_enabled) {
    redirect('/admin/funcionalidades')
  }
  const lanzamientos = await listLanzamientosAdmin(tenantId)

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <PageHeader
        eyebrow="Contenido"
        tone="oliva"
        titulo="Lanzamientos"
        descripcion={
          <>
            Anuncia productos nuevos con campaña de expectativa. En modo
            teaser tus clientes ven un banner con cuenta regresiva; al
            revelarse aparece la descripción completa y el botón de acción.
          </>
        }
      />

      <LanzamientosAdminPanel initial={lanzamientos} />
    </div>
  )
}
