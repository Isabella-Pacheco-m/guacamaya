import { requireAdmin } from '@/lib/page-auth'
import { listRecompensas } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { CreateRecompensaForm } from '@/components/admin/CreateRecompensaForm'
import { ToggleRecompensaActiva } from '@/components/admin/ToggleRecompensaActiva'
import { DeleteRecompensa } from '@/components/admin/DeleteRecompensa'

export const dynamic = 'force-dynamic'

const COP = new Intl.NumberFormat('es-CO')

export default async function RecompensasPage() {
  const { tenantId } = await requireAdmin()
  const recompensas = await listRecompensas(tenantId)
  const activas = recompensas.filter((r) => r.activa).length

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Recompensas
        </h1>
        <p className="text-muted text-sm mt-2">
          {activas} activas · {recompensas.length} en total.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium mb-4">Nueva recompensa</h2>
        <CreateRecompensaForm />
      </Card>

      <Card padding="none" className="overflow-hidden">
        {recompensas.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Aún no hay recompensas. Crea la primera arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Descripción</th>
                  <th className="px-6 py-3 font-medium text-right">Costo</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {recompensas.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 font-medium">{r.nombre}</td>
                    <td className="px-6 py-4 text-muted">{r.descripcion ?? '—'}</td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {COP.format(r.costo_puntos)} pts
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge active={r.activa} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <ToggleRecompensaActiva id={r.id} activa={r.activa} />
                        <DeleteRecompensa id={r.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
