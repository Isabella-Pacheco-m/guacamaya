import { requireAdmin } from '@/lib/page-auth'
import { listMiembros } from '@/lib/tenantQueries'
import { getTenantFeatures } from '@/lib/tenant-features'
import { getJoinCode } from '@/lib/tenant'
import { joinUrl } from '@/lib/config'
import { Card } from '@/components/ui/Card'
import { CreateMiembroForm } from '@/components/admin/CreateMiembroForm'
import { MiembrosBuscador } from '@/components/admin/MiembrosBuscador'
import { ComunidadAccesoPanel } from '@/components/admin/ComunidadAccesoPanel'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function MiembrosPage() {
  const { tenantId } = await requireAdmin()
  const [miembros, features, joinCode] = await Promise.all([
    listMiembros(tenantId),
    getTenantFeatures(tenantId),
    getJoinCode(tenantId),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Clientes"
        tone="terra"
        titulo="Miembros"
        descripcion={
          <>
            Busca un miembro por nombre, correo o teléfono para registrar su
            compra o sumar sellos.
          </>
        }
      />

      <Card>
        <h2 className="text-sm font-medium mb-4">Cómo se une la gente</h2>
        <ComunidadAccesoPanel
          initialRegistroAbierto={features.registro_abierto}
          initialUrl={joinCode ? joinUrl(joinCode) : null}
        />
      </Card>

      <MiembrosBuscador
        miembros={miembros}
        tarjetaEnabled={features.tarjeta_enabled}
      />

      <Card>
        <h2 className="text-sm font-medium mb-4">Nuevo miembro</h2>
        <CreateMiembroForm />
      </Card>
    </div>
  )
}
