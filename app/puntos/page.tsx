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
      <div className="px-6 py-10 max-w-md mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-8">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← {tenant.nombre}
          </Link>
          <h1 className="text-2xl font-light mt-1 leading-tight">
            Tus movimientos
          </h1>
        </header>

        <Card className="mb-8" padding="lg">
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

        <Link href="/" className="block mt-6">
          <Button variant="secondary" className="w-full">
            Volver
          </Button>
        </Link>
      </div>
    </main>
  )
}
