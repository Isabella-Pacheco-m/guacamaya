import Link from 'next/link'
import { requireAdmin } from '@/lib/page-auth'
import {
  getMetricasResumen,
  listMiembros,
  listRecompensas,
} from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

const COP = new Intl.NumberFormat('es-CO')

const PERIODOS = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
] as const

function parseDias(raw: string | undefined): number {
  const n = Number(raw)
  if (PERIODOS.some((p) => p.dias === n)) return n
  return 30
}

function Stat({
  label,
  value,
  hint,
  size = 'md',
  tone = 'light',
}: {
  label: string
  value: string
  hint?: string
  size?: 'md' | 'lg'
  tone?: 'light' | 'dark'
}) {
  const valueClass =
    size === 'lg' ? 'mt-3 text-[44px] font-light leading-none tracking-tight'
                  : 'mt-2 text-[28px] font-light leading-none'
  if (tone === 'dark') {
    return (
      <div className="flex flex-col rounded-lg bg-graphite text-white shadow-card p-6">
        <div className="text-[11px] text-white/50 uppercase tracking-wider">
          {label}
        </div>
        <div className={`${valueClass} text-white tabular-nums`}>{value}</div>
        {hint && <div className="mt-2 text-xs text-lime">{hint}</div>}
      </div>
    )
  }
  return (
    <Card padding="md" className="flex flex-col">
      <div className="text-[11px] text-muted uppercase tracking-wider">{label}</div>
      <div className={`${valueClass} text-graphite tabular-nums`}>{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </Card>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { dias?: string }
}) {
  const { tenantId } = await requireAdmin()
  const dias = parseDias(searchParams.dias)

  const [miembros, recompensas, metricas] = await Promise.all([
    listMiembros(tenantId),
    listRecompensas(tenantId),
    getMetricasResumen(tenantId, dias),
  ])

  const puntosCirculacion = miembros.reduce(
    (sum, m) => sum + m.puntos_actuales,
    0
  )
  const puntosEmitidos = miembros.reduce(
    (sum, m) => sum + m.puntos_historicos,
    0
  )
  const recompensasActivas = recompensas.filter((r) => r.activa).length
  const distribucionNivel = miembros.reduce(
    (acc, m) => {
      acc[m.nivel] = (acc[m.nivel] ?? 0) + 1
      return acc
    },
    { BRONCE: 0, PLATA: 0, ORO: 0 } as Record<string, number>
  )
  const totalNiveles = (Object.values(distribucionNivel) as number[]).reduce(
    (a, b) => a + b,
    0
  )

  const ticketPromedio =
    metricas.compras_count > 0
      ? Math.round(metricas.compras_monto_cop / metricas.compras_count)
      : 0

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Dashboard
        </h1>
        <p className="text-muted text-sm mt-2">
          Vista general de tu programa de fidelización.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Miembros"
          value={COP.format(miembros.length)}
          size="lg"
          tone="dark"
          hint={`${COP.format(distribucionNivel.ORO ?? 0)} en nivel Oro`}
        />
        <Stat
          label="Puntos en circulación"
          value={COP.format(puntosCirculacion)}
          hint="Saldo disponible para canjes"
        />
        <Stat
          label="Puntos emitidos histórico"
          value={COP.format(puntosEmitidos)}
        />
        <Stat
          label="Recompensas activas"
          value={`${recompensasActivas}`}
          hint={`${recompensas.length} en total`}
        />
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-light tracking-tight">Actividad</h2>
            <p className="text-muted text-sm mt-1">
              Últimos {dias} días
            </p>
          </div>
          <div className="flex gap-1.5 text-xs bg-white border border-border rounded-full p-1">
            {PERIODOS.map((p) => {
              const isActive = p.dias === dias
              return (
                <Link
                  key={p.dias}
                  href={`/admin/dashboard?dias=${p.dias}`}
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

        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            label="Miembros nuevos"
            value={COP.format(metricas.miembros_nuevos)}
          />
          <Stat
            label="Compras"
            value={COP.format(metricas.compras_count)}
            hint={`Ticket promedio $${COP.format(ticketPromedio)}`}
          />
          <Stat
            label="Ventas"
            value={`$${COP.format(metricas.compras_monto_cop)}`}
          />
          <Stat
            label="Canjes"
            value={COP.format(metricas.canjes_count)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Stat
            label="Puntos emitidos"
            value={COP.format(metricas.puntos_emitidos)}
            hint="En el período seleccionado"
          />
          <Stat
            label="Puntos canjeados"
            value={COP.format(metricas.puntos_canjeados)}
            hint="En el período seleccionado"
          />
        </div>
      </section>

      <section>
        <Card>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-base font-medium text-graphite">
              Distribución por nivel
            </h2>
            <span className="text-xs text-muted">
              {COP.format(totalNiveles)} miembros
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {(['BRONCE', 'PLATA', 'ORO'] as const).map((nivel) => {
              const count = distribucionNivel[nivel] ?? 0
              const pct = totalNiveles > 0 ? (count / totalNiveles) * 100 : 0
              return (
                <div key={nivel} className="flex items-center gap-4">
                  <div className="w-20 text-xs text-muted tracking-wider">
                    {nivel}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-graphite transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-20 text-right tabular-nums text-sm">
                    {COP.format(count)}
                    <span className="text-muted text-xs ml-2">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </section>
    </div>
  )
}
