import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listGaleriaAdmin } from '@/lib/galeria'
import { GaleriaAdminPanel } from '@/components/admin/GaleriaAdminPanel'

export const dynamic = 'force-dynamic'

export default async function GaleriaAdminPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.galeria_enabled) {
    redirect('/admin/funcionalidades')
  }

  const [pendientes, aprobadas, rechazadas] = await Promise.all([
    listGaleriaAdmin(tenantId, 'pendiente'),
    listGaleriaAdmin(tenantId, 'aprobado'),
    listGaleriaAdmin(tenantId, 'rechazado'),
  ])

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Galería
        </h1>
        <p className="text-muted text-sm mt-2">
          Fotos que tus clientes suben del local y tus productos. Aprueba las que
          quieras publicar en la PWA y dales puntos por participar.
        </p>
      </div>

      <GaleriaAdminPanel
        initialPendientes={pendientes}
        initialAprobadas={aprobadas}
        initialRechazadas={rechazadas}
        puntosDefault={features.galeria_puntos}
      />
    </div>
  )
}
