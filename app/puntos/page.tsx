import Link from 'next/link'
import { requireCliente } from '@/lib/page-auth'
import { listTransaccionesForMiembro } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HistorialList } from '@/components/HistorialList'
import { TenantTheme } from '@/components/pwa/TenantTheme'

export const dynamic = 'force-dynamic'

const numFmt = new Intl.NumberFormat('es-CO')

export default async function PuntosPwaPage() {
  const { tenant, miembro } = await requireCliente()
  const transacciones = await listTransaccionesForMiembro(tenant.id, miembro.id, 100)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md lg:max-w-4xl mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-8">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← {tenant.nombre}
          </Link>
          <h1 className="text-2xl font-light mt-1 leading-tight">
            Tus movimientos
          </h1>
        </header>

        <div className="lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:items-start">
          <Card className="mb-6 lg:mb-0 lg:sticky lg:top-10" padding="lg">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Saldo actual
            </p>
            <p className="text-[56px] font-light tabular-nums leading-none mt-2">
              {numFmt.format(miembro.puntos_actuales)}
            </p>
            <p className="text-sm text-muted mt-1">puntos disponibles</p>
            <div className="mt-5 pt-5 border-t border-border flex items-center justify-between text-xs text-muted">
              <span>Acumulados históricos</span>
              <span className="tabular-nums text-graphite">
                {numFmt.format(miembro.puntos_historicos)}
              </span>
            </div>
          </Card>

          <HistorialList
            transacciones={transacciones}
            emptyText="Aún no tienes movimientos."
          />
        </div>

        <Link href="/" className="mt-6 block lg:inline-block">
          <Button variant="secondary" className="w-full lg:w-auto">
            Volver
          </Button>
        </Link>
      </div>
    </main>
  )
}
