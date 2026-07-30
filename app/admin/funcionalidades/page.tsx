import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { FuncionalidadesForm } from '@/components/admin/FuncionalidadesForm'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function FuncionalidadesPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <PageHeader
        eyebrow="Configuración"
        tone="arcilla"
        titulo="Funcionalidades"
        descripcion={
          <>
            Activa solo lo que tu negocio necesita. Tus clientes verán cada
            sección en la PWA según lo que dejes prendido aquí.
          </>
        }
      />
      <FuncionalidadesForm initial={features} />
    </div>
  )
}
