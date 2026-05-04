import Link from 'next/link'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantById } from '@/lib/tenant'
import { listMiembrosInactivos } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const COP = new Intl.NumberFormat('es-CO')
const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
})

const PERIODOS = [
  { dias: 30, label: '30 días' },
  { dias: 60, label: '60 días' },
  { dias: 90, label: '90 días' },
] as const

function parseDias(raw: string | undefined): number {
  const n = Number(raw)
  if (PERIODOS.some((p) => p.dias === n)) return n
  return 30
}

function formatTelefono(telefono: string | null): string {
  if (!telefono) return '—'
  const m = telefono.match(/^57(\d{3})(\d{3})(\d{4})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : telefono
}

// Mensaje de WhatsApp pre-poblado para reactivar al miembro. Usa wa.me con el
// número en E.164 sin "+". El admin lo edita antes de enviar.
function waLink(telefono: string | null, nombre: string, tenantNombre: string): string | null {
  if (!telefono) return null
  const primerNombre = nombre.split(' ')[0]
  const texto = encodeURIComponent(
    `Hola ${primerNombre}, te escribimos de ${tenantNombre}. Hace rato no te vemos por acá — ¿te animas a pasar?`
  )
  return `https://wa.me/${telefono}?text=${texto}`
}

export default async function InactivosPage({
  searchParams,
}: {
  searchParams: { dias?: string }
}) {
  const { tenantId } = await requireAdmin()
  const dias = parseDias(searchParams.dias)
  const [tenant, inactivos] = await Promise.all([
    getTenantById(tenantId),
    listMiembrosInactivos(tenantId, dias),
  ])
  const tenantNombre = tenant?.nombre ?? ''

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[44px] font-light tracking-tight leading-tight">
            Inactivos
          </h1>
          <p className="text-muted text-sm mt-2">
            Miembros sin compras en los últimos {dias} días.
          </p>
        </div>
        <div className="flex gap-1.5 text-xs bg-white border border-border rounded-full p-1">
          {PERIODOS.map((p) => {
            const isActive = p.dias === dias
            return (
              <Link
                key={p.dias}
                href={`/admin/inactivos?dias=${p.dias}`}
                className={
                  isActive
                    ? 'rounded-full px-4 py-1.5 bg-graphite text-white transition-colors'
                    : 'rounded-full px-4 py-1.5 text-muted hover:text-graphite transition-colors'
                }
              >
                {p.label}
              </Link>
            )
          })}
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        {inactivos.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Ningún miembro inactivo en este período. Buen trabajo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium">Nivel</th>
                  <th className="px-6 py-3 font-medium">Última compra</th>
                  <th className="px-6 py-3 font-medium text-right">Puntos</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {inactivos.map((m) => {
                  const wa = waLink(m.telefono, m.nombre, tenantNombre)
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border last:border-0 hover:bg-surface/50"
                    >
                      <td className="px-6 py-4">{m.nombre}</td>
                      <td className="px-6 py-4 text-muted">
                        {formatTelefono(m.telefono)}
                      </td>
                      <td className="px-6 py-4">
                        <NivelBadge nivel={m.nivel} />
                      </td>
                      <td className="px-6 py-4">
                        {m.ultima_compra ? (
                          <div className="flex flex-col">
                            <span>{dateFmt.format(new Date(m.ultima_compra))}</span>
                            <span className="text-xs text-muted">
                              hace {m.dias_inactivo} días
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">
                            Nunca · {m.dias_inactivo} días registrado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {COP.format(m.puntos_actuales)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="text-electric text-xs hover:underline mr-4"
                          >
                            WhatsApp →
                          </a>
                        )}
                        <Link
                          href={`/admin/miembros/${m.id}`}
                          className="text-electric text-xs hover:underline"
                        >
                          Ver detalle →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
