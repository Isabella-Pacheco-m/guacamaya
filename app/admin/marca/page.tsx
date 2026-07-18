import { requireAdmin } from '@/lib/page-auth'
import { getTenantById } from '@/lib/tenant'
import { Card } from '@/components/ui/Card'
import { MarcaForm } from '@/components/admin/MarcaForm'

export const dynamic = 'force-dynamic'

export default async function MarcaPage() {
  const { tenantId } = await requireAdmin()
  const tenant = await getTenantById(tenantId)

  if (!tenant) {
    return (
      <Card className="text-center">
        <h1 className="text-xl font-light mb-2">Tenant no encontrado</h1>
        <p className="text-sm text-muted">
          No pudimos cargar la información de tu negocio.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Marca</h1>
        <p className="text-muted text-sm mt-2">
          Personaliza el nombre y los colores que ven tus clientes en{' '}
          <span className="font-mono text-graphite">{tenant.slug}</span>.
        </p>
      </div>

      <Card padding="lg">
        <MarcaForm
          initialNombre={tenant.nombre}
          initialColor={tenant.color_primario}
          initialPuntosCumpleanos={tenant.puntos_cumpleanos}
          initialLogoUrl={tenant.logo_url}
          initialBannerUrl={tenant.banner_url}
        />
      </Card>
    </div>
  )
}
