import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantById } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listCumpleanerosDelMes } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const COP = new Intl.NumberFormat('es-CO')

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

function parseMes(raw: string | undefined): number {
  const n = Number(raw)
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n
  // Mes actual en zona Bogotá (UTC-5).
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    timeZone: 'America/Bogota',
  })
  return Number(fmt.format(new Date()))
}

function formatTelefono(telefono: string | null): string {
  if (!telefono) return '—'
  const m = telefono.match(/^57(\d{3})(\d{3})(\d{4})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : telefono
}

function waLink(telefono: string | null, nombre: string, tenantNombre: string): string | null {
  if (!telefono) return null
  const primerNombre = nombre.split(' ')[0]
  const texto = encodeURIComponent(
    `Hola ${primerNombre}, te escribimos de ${tenantNombre}. Este mes cumples años — tenemos algo especial para ti. ¿Te animas a pasar?`
  )
  return `https://wa.me/${telefono}?text=${texto}`
}

export default async function CumpleanerosPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.cumpleanos_enabled) {
    redirect('/admin/funcionalidades')
  }

  const mes = parseMes(searchParams.mes)
  const [tenant, cumpleaneros] = await Promise.all([
    getTenantById(tenantId),
    listCumpleanerosDelMes(tenantId, mes),
  ])
  const tenantNombre = tenant?.nombre ?? ''

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Cumpleañeros
        </h1>
        <p className="text-muted text-sm mt-2">
          Miembros que cumplen años en {MESES[mes - 1].toLowerCase()}.
        </p>
      </div>

      <div className="inline-flex gap-1 text-xs bg-white border border-border rounded-full p-1 self-start flex-wrap">
        {MESES.map((label, idx) => {
          const valor = idx + 1
          const isActive = valor === mes
          return (
            <Link
              key={valor}
              href={`/admin/cumpleaneros?mes=${valor}`}
              className={
                isActive
                  ? 'rounded-full px-3 py-1.5 bg-graphite text-white transition-colors'
                  : 'rounded-full px-3 py-1.5 text-muted hover:text-graphite transition-colors'
              }
            >
              {label.slice(0, 3)}
            </Link>
          )
        })}
      </div>

      <Card padding="none" className="overflow-hidden">
        {cumpleaneros.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Ningún miembro registrado con cumpleaños en {MESES[mes - 1].toLowerCase()}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium">Nivel</th>
                  <th className="px-6 py-3 font-medium text-right">Puntos</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {cumpleaneros.map((m) => {
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
