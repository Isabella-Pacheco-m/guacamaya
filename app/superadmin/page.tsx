import Link from 'next/link'
import { getPlatformStats } from '@/lib/superadmin-stats'
import { tenantBaseUrl } from '@/lib/config'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

const nf = new Intl.NumberFormat('es-CO')

export default async function SuperadminHome() {
  const stats = await getPlatformStats()
  const { tenants } = stats

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[44px] font-light tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-muted text-sm mt-2">
            Resumen de la plataforma · {stats.total_tenants}{' '}
            {stats.total_tenants === 1 ? 'negocio' : 'negocios'}
          </p>
        </div>
        <Link href="/superadmin/tenants/new">
          <Button>Crear negocio</Button>
        </Link>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Negocios" value={nf.format(stats.total_tenants)} />
        <StatCard label="Miembros" value={nf.format(stats.total_miembros)} />
        <StatCard
          label="Puntos activos"
          value={nf.format(stats.total_puntos_activos)}
          hint="En circulación hoy"
        />
        <StatCard
          label="Puntos emitidos"
          value={nf.format(stats.total_puntos_historicos)}
          hint="Históricos acumulados"
        />
      </div>

      {/* Tabla de negocios + sus usuarios */}
      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Negocios
        </h2>
        <Card padding="none" className="overflow-hidden">
          {tenants.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">
              Aún no hay tenants. Crea el primero con el botón de arriba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                    <th className="px-6 py-3 font-medium">Negocio</th>
                    <th className="px-6 py-3 font-medium text-right">Miembros</th>
                    <th className="px-6 py-3 font-medium text-right">Nuevos 30d</th>
                    <th className="px-6 py-3 font-medium">Niveles</th>
                    <th className="px-6 py-3 font-medium text-right">
                      Puntos activos
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border last:border-0 hover:bg-surface/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {t.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.logo_url}
                              alt=""
                              className="h-8 w-8 rounded-md object-contain shrink-0"
                            />
                          ) : (
                            <span
                              className="h-8 w-8 rounded-md shrink-0 border border-border"
                              style={{ backgroundColor: t.color_primario }}
                            />
                          )}
                          <div className="leading-tight">
                            <div className="font-medium">{t.nombre}</div>
                            <div className="font-mono text-xs text-muted">
                              {t.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-medium">
                        {nf.format(t.miembros)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {t.miembros_30d > 0 ? (
                          <span className="text-electric">
                            +{nf.format(t.miembros_30d)}
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <NivelChips niveles={t.niveles} />
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {nf.format(t.puntos_activos)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <a
                          href={tenantBaseUrl(t.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-electric text-xs hover:underline"
                        >
                          Abrir →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-[32px] font-light tracking-tight leading-none mt-2 tabular-nums">
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted mt-2">{hint}</p>}
    </Card>
  )
}

function NivelChips({
  niveles,
}: {
  niveles: Record<'BRONCE' | 'PLATA' | 'ORO', number>
}) {
  const items: { label: string; n: number; cls: string }[] = [
    { label: 'B', n: niveles.BRONCE, cls: 'bg-[#CD7F32]/15 text-[#8a5a2b]' },
    { label: 'P', n: niveles.PLATA, cls: 'bg-muted/15 text-muted' },
    { label: 'O', n: niveles.ORO, cls: 'bg-lime/25 text-graphite' },
  ]
  const visibles = items.filter((i) => i.n > 0)
  if (visibles.length === 0) {
    return <span className="text-muted text-xs">—</span>
  }
  return (
    <div className="flex items-center gap-1.5">
      {visibles.map((i) => (
        <span
          key={i.label}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${i.cls}`}
          title={`${i.label === 'B' ? 'Bronce' : i.label === 'P' ? 'Plata' : 'Oro'}: ${i.n}`}
        >
          {i.label} {i.n}
        </span>
      ))}
    </div>
  )
}
