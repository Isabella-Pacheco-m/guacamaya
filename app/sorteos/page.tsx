import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listSorteosActivos } from '@/lib/sorteos'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'

export const dynamic = 'force-dynamic'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const ESTADO_LABEL: Record<string, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
}

export default async function SorteosPwaPage() {
  const { tenant } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.sorteos_enabled) redirect('/')

  const sorteos = await listSorteosActivos(tenant.id)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 max-w-md mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-8">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← {tenant.nombre}
          </Link>
          <h1 className="text-2xl font-light mt-1 leading-tight">Sorteos</h1>
          <p className="text-sm text-muted mt-1.5">
            Participa y queda en el sombrero.
          </p>
        </header>

        {sorteos.length === 0 ? (
          <Card className="text-center" padding="lg">
            <p className="text-sm text-muted">
              No hay sorteos activos por ahora.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sorteos.map((s) => (
              <Link key={s.id} href={`/sorteos/${s.id}`} className="block group">
                <article className="bg-white rounded-lg shadow-card overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),_0_8px_24px_rgba(0,0,0,0.06)]">
                  {s.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.imagen_url}
                      alt=""
                      className="w-full max-h-56 object-cover"
                    />
                  )}
                  <div className="p-5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider bg-electric/10 text-electric rounded-full px-2 py-0.5 font-medium">
                        {ESTADO_LABEL[s.estado] ?? s.estado}
                      </span>
                      {s.cierra_at && (
                        <span className="text-xs text-muted">
                          Cierra {dateFmt.format(new Date(s.cierra_at))}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-medium leading-tight">
                      {s.titulo}
                    </h2>
                    {s.descripcion && (
                      <p className="text-sm text-muted line-clamp-3">
                        {s.descripcion}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <Link href="/" className="block mt-8">
          <Button variant="secondary" className="w-full">
            Volver
          </Button>
        </Link>
      </div>
    </main>
  )
}
