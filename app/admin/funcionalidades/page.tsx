import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { FuncionalidadesForm } from '@/components/admin/FuncionalidadesForm'

export const dynamic = 'force-dynamic'

export default async function FuncionalidadesPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Funcionalidades</h1>
        <p className="text-muted text-sm mt-2">
          Activa solo lo que tu negocio necesita. Tus clientes verán cada
          sección en la PWA según lo que dejes prendido aquí.
        </p>
      </div>
      <FuncionalidadesForm initial={features} />
    </div>
  )
}
