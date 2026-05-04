import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listTarjetaPremios } from '@/lib/tenantQueries'
import { TarjetaPremiosForm } from '@/components/admin/TarjetaPremiosForm'

export const dynamic = 'force-dynamic'

export default async function TarjetaPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.tarjeta_enabled) {
    redirect('/admin/funcionalidades')
  }
  const premios = await listTarjetaPremios(tenantId)

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Tarjeta</h1>
        <p className="text-muted text-sm mt-2">
          Tarjeta de {features.tarjeta_size} sellos. Configura los premios que
          tu cliente desbloquea al llegar a cada umbral.
        </p>
      </div>
      <TarjetaPremiosForm initial={premios} tarjetaSize={features.tarjeta_size} />
    </div>
  )
}
