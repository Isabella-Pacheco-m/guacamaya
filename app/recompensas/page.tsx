import Link from 'next/link'
import { requireCliente } from '@/lib/page-auth'
import { listRecompensasActivas } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'

export const dynamic = 'force-dynamic'

const fmt = new Intl.NumberFormat('es-CO')

export default async function RecompensasPwaPage() {
  const { tenant, miembro } = await requireCliente()
  const recompensas = await listRecompensasActivas(tenant.id)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md lg:max-w-4xl mx-auto">
      <TenantTheme color={tenant.color_primario} />
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-electric hover:underline">
            ← {tenant.nombre}
          </Link>
          <h1 className="text-2xl font-light mt-1 leading-tight">Recompensas</h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-muted">Tienes</p>
          <p className="text-xl font-light tabular-nums">
            {fmt.format(miembro.puntos_actuales)} <span className="text-sm text-muted">pts</span>
          </p>
        </div>
      </header>

      {recompensas.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-muted">
            {tenant.nombre} aún no tiene recompensas disponibles.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4 lg:items-start">
          {recompensas.map((r) => {
            const alcanza = miembro.puntos_actuales >= r.costo_puntos
            return (
              <Card key={r.id} interactive={alcanza} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium leading-tight">{r.nombre}</h2>
                    {r.descripcion && (
                      <p className="text-sm text-muted mt-1.5">{r.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-light tabular-nums leading-none">
                      {fmt.format(r.costo_puntos)}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted mt-1">
                      puntos
                    </p>
                  </div>
                </div>
                {alcanza ? (
                  <Link href={`/canjear/${r.id}`} className="block mt-4">
                    <Button className="w-full">Canjear</Button>
                  </Link>
                ) : (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-electric/40 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (miembro.puntos_actuales / r.costo_puntos) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted shrink-0 tabular-nums">
                      Faltan {fmt.format(r.costo_puntos - miembro.puntos_actuales)}
                    </p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted text-center mt-10">
        Para canjear, muéstrale tu cuenta al personal en mostrador.
      </p>

      <Link href="/" className="mt-6 block lg:inline-block">
        <Button variant="secondary" className="w-full lg:w-auto">
          Volver
        </Button>
      </Link>
      </div>
    </main>
  )
}
