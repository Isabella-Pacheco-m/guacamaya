import { requireAdmin } from '@/lib/page-auth'
import { listMiembros, listRecompensasActivas } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { ProcesarCanjeForm } from '@/components/admin/ProcesarCanjeForm'

export const dynamic = 'force-dynamic'

export default async function CanjesPage() {
  const { tenantId } = await requireAdmin()
  const [miembros, recompensas] = await Promise.all([
    listMiembros(tenantId),
    listRecompensasActivas(tenantId),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Canjes</h1>
        <p className="text-muted text-sm mt-2">
          Procesa el canje de una recompensa en mostrador.
        </p>
      </div>

      <Card padding="lg" className="max-w-2xl">
        <ProcesarCanjeForm miembros={miembros} recompensas={recompensas} />
      </Card>
    </div>
  )
}
