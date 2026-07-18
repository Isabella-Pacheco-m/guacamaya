import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listLanzamientosPwa } from '@/lib/lanzamientos'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { LanzamientoCard } from '@/components/pwa/LanzamientoCard'

export const dynamic = 'force-dynamic'

export default async function LanzamientosPwaPage() {
  const { tenant } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.lanzamientos_enabled) redirect('/')

  const lanzamientos = await listLanzamientosPwa(tenant.id)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md lg:max-w-2xl mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-6">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← Inicio
          </Link>
          <h1 className="text-2xl font-light leading-tight tracking-tight mt-3">
            Lanzamientos
          </h1>
          <p className="text-sm text-muted mt-1">
            Lo nuevo que se viene en {tenant.nombre}.
          </p>
        </header>

        {lanzamientos.length === 0 ? (
          <Card className="text-center" padding="lg">
            <p className="text-sm text-muted">
              Aún no hay lanzamientos. Vuelve pronto 👀
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-5">
            {lanzamientos.map((l) => (
              <LanzamientoCard key={l.id} lanzamiento={l} />
            ))}
          </div>
        )}

        <Link href="/" className="mt-8 block lg:inline-block">
          <Button variant="secondary" className="w-full lg:w-auto">
            Volver
          </Button>
        </Link>
      </div>
    </main>
  )
}
