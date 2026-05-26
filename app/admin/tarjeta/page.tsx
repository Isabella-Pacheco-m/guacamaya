import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantById } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listTarjetaPremios } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { TarjetaPremiosForm } from '@/components/admin/TarjetaPremiosForm'
import { TarjetaTemaForm } from '@/components/admin/TarjetaTemaForm'

export const dynamic = 'force-dynamic'

export default async function TarjetaPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.tarjeta_enabled) {
    redirect('/admin/funcionalidades')
  }
  const [tenant, premios] = await Promise.all([
    getTenantById(tenantId),
    listTarjetaPremios(tenantId),
  ])

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Tarjeta
        </h1>
        <p className="text-muted text-sm mt-2">
          Tarjeta de {features.tarjeta_size} sellos. Personaliza cómo se ve en
          la PWA del cliente y configura los premios que desbloquean al llegar
          a cada umbral.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-light tracking-tight">Diseño</h2>
          <p className="text-muted text-sm mt-1">
            Número de sellos, color de fondo, color del sello y forma. Aplica
            solo a la tarjeta.
          </p>
        </div>
        <Card padding="lg">
          <TarjetaTemaForm
            features={features}
            tenantNombre={tenant?.nombre ?? 'Tu negocio'}
            premios={premios}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-light tracking-tight">Premios</h2>
          <p className="text-muted text-sm mt-1">
            Define qué desbloquea cada umbral de sellos.
          </p>
        </div>
        <TarjetaPremiosForm initial={premios} tarjetaSize={features.tarjeta_size} />
      </section>
    </div>
  )
}
