import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  countPushSuscriptores,
  listPushEnvios,
  pushConfigurado,
  vapidParejaValida,
} from '@/lib/push'
import { NotificacionesPanel } from '@/components/admin/NotificacionesPanel'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function NotificacionesPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.push_enabled) {
    redirect('/admin/funcionalidades')
  }
  const [suscriptores, envios] = await Promise.all([
    countPushSuscriptores(tenantId),
    listPushEnvios(tenantId),
  ])

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <PageHeader
        eyebrow="Contenido"
        tone="oliva"
        titulo="Notificaciones"
        descripcion={
          <>
            Mándale una notificación al celular de tus miembros: promos,
            novedades o un aviso del día. Llega a los miembros que las
            activaron desde su app del club.
          </>
        }
      />

      <NotificacionesPanel
        suscriptores={suscriptores}
        envios={envios}
        configurado={pushConfigurado()}
        clavesOk={vapidParejaValida()}
      />
    </div>
  )
}
