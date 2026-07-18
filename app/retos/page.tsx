import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listRetosPwa } from '@/lib/retos'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'

export const dynamic = 'force-dynamic'

export default async function RetosPwaPage() {
  const { tenant } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.retos_enabled) redirect('/')

  const retos = await listRetosPwa(tenant.id)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md lg:max-w-2xl mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-6">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← Inicio
          </Link>
          <h1 className="text-2xl font-light leading-tight tracking-tight mt-3">Retos</h1>
          <p className="text-sm text-muted mt-1">
            Cumple metas y gana puntos en {tenant.nombre}.
          </p>
        </header>

        {retos.length === 0 ? (
          <Card className="text-center" padding="lg">
            <p className="text-sm text-muted">No hay retos activos por ahora.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {retos.map((r) => (
              <Link key={r.id} href={`/retos/${r.id}`} className="block group">
                <article className="bg-white rounded-2xl shadow-card overflow-hidden transition-transform group-hover:-translate-y-0.5">
                  {r.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imagen_url} alt="" className="w-full aspect-[16/9] object-cover" />
                  )}
                  <div className="p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={
                          'text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-medium ' +
                          (r.estado === 'ABIERTO' ? 'bg-electric/10 text-electric' : 'bg-surface text-muted')
                        }
                      >
                        {r.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
                      </span>
                      {r.puntos > 0 && (
                        <span className="text-[11px] font-medium text-graphite bg-lime/40 rounded-full px-2 py-0.5">
                          +{r.puntos} pts
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-medium leading-tight">{r.titulo}</h2>
                    {r.descripcion && (
                      <p className="text-sm text-muted line-clamp-3">{r.descripcion}</p>
                    )}
                  </div>
                </article>
              </Link>
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
