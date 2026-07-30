import { requireAdmin } from '@/lib/page-auth'
import { listMiembros, listRecompensasActivas } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { ProcesarCanjeForm } from '@/components/admin/ProcesarCanjeForm'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function CanjesPage() {
  const { tenantId } = await requireAdmin()
  const [miembros, recompensas] = await Promise.all([
    listMiembros(tenantId),
    listRecompensasActivas(tenantId),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Fidelización"
        tone="sol"
        titulo="Canjes"
        descripcion="Procesa el canje de una recompensa en mostrador."
      />

      <Card padding="lg" className="max-w-2xl">
        <ProcesarCanjeForm miembros={miembros} recompensas={recompensas} />
      </Card>
    </div>
  )
}
