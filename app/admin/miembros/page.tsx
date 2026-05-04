import Link from 'next/link'
import { requireAdmin } from '@/lib/page-auth'
import { listMiembros } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'
import { CreateMiembroForm } from '@/components/admin/CreateMiembroForm'

export const dynamic = 'force-dynamic'

const COP = new Intl.NumberFormat('es-CO')

function formatTelefono(telefono: string | null): string {
  if (!telefono) return '—'
  const m = telefono.match(/^57(\d{3})(\d{3})(\d{4})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : telefono
}

export default async function MiembrosPage() {
  const { tenantId } = await requireAdmin()
  const miembros = await listMiembros(tenantId)

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Miembros
        </h1>
        <p className="text-muted text-sm mt-2">
          {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'} registrados.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium mb-4">Nuevo miembro</h2>
        <CreateMiembroForm />
      </Card>

      <Card padding="none" className="overflow-hidden">
        {miembros.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Aún no hay miembros. Crea el primero arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Nivel</th>
                  <th className="px-6 py-3 font-medium text-right">Puntos</th>
                  <th className="px-6 py-3 font-medium text-right">Histórico</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {miembros.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-6 py-4">{m.nombre}</td>
                    <td className="px-6 py-4 text-muted">{formatTelefono(m.telefono)}</td>
                    <td className="px-6 py-4 text-muted">{m.email ?? '—'}</td>
                    <td className="px-6 py-4">
                      <NivelBadge nivel={m.nivel} />
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {COP.format(m.puntos_actuales)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted">
                      {COP.format(m.puntos_historicos)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/miembros/${m.id}`}
                        className="text-electric text-xs hover:underline"
                      >
                        Ver detalle →
                      </Link>
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
