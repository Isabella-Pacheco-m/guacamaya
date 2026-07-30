import { requireAdmin } from '@/lib/page-auth'
import { getTenantById } from '@/lib/tenant'
import { Card } from '@/components/ui/Card'
import { MarcaForm } from '@/components/admin/MarcaForm'
import { PageHeader } from '@/components/admin/PageHeader'

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
      <PageHeader
        eyebrow="Configuración"
        tone="arcilla"
        titulo="Marca"
        descripcion={
          <>
            Personaliza el nombre y los colores que ven tus clientes en{' '}
            <span className="font-mono text-graphite">{tenant.slug}</span>.
          </>
        }
      />

      <Card padding="lg">
        <MarcaForm
          initialNombre={tenant.nombre}
          initialColor={tenant.color_primario}
          initialPuntosCumpleanos={tenant.puntos_cumpleanos}
          initialPuntosCaducidadMeses={tenant.puntos_caducidad_meses}
          initialLogoUrl={tenant.logo_url}
          initialBannerUrl={tenant.banner_url}
        />
      </Card>
    </div>
  )
}
