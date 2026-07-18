import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listGaleriaAprobadas, listGaleriaMiembro } from '@/lib/galeria'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { GaleriaComposer } from '@/components/pwa/GaleriaComposer'
import { GaleriaGrid } from '@/components/pwa/GaleriaGrid'

export const dynamic = 'force-dynamic'

const ESTADO_LABEL: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'En revisión', cls: 'bg-surface text-muted' },
  aprobado: { label: 'Aprobada', cls: 'bg-electric/10 text-electric' },
  rechazado: { label: 'No publicada', cls: 'bg-red-50 text-red-600' },
}

export default async function GaleriaPwaPage() {
  const { tenant, miembro } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.galeria_enabled) redirect('/')

  const [aprobadas, mias] = await Promise.all([
    listGaleriaAprobadas(tenant.id),
    listGaleriaMiembro(tenant.id, miembro.id),
  ])
  const misPendientesORechazadas = mias.filter((p) => p.estado !== 'aprobado')

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md lg:max-w-2xl mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-6">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← Inicio
          </Link>
          <h1 className="text-2xl font-light leading-tight tracking-tight mt-3">
            Galería
          </h1>
          <p className="text-sm text-muted mt-1">
            Comparte fotos de {tenant.nombre}
            {features.galeria_puntos > 0 && (
              <>
                {' '}y gana{' '}
                <span className="text-graphite font-medium">
                  {features.galeria_puntos} puntos
                </span>{' '}
                por cada una aprobada
              </>
            )}
            .
          </p>
        </header>

        <div className="mb-6">
          <GaleriaComposer puntos={features.galeria_puntos} />
        </div>

        {misPendientesORechazadas.length > 0 && (
          <section className="mb-8">
            <p className="text-[11px] uppercase tracking-wider text-muted mb-3">
              Tus envíos
            </p>
            <div className="flex flex-col gap-2">
              {misPendientesORechazadas.map((p) => {
                const meta = ESTADO_LABEL[p.estado] ?? ESTADO_LABEL.pendiente
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 bg-white rounded-lg shadow-card p-2.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagen_url}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover bg-surface shrink-0"
                    />
                    <p className="text-sm text-graphite/90 truncate flex-1">
                      {p.caption || 'Sin texto'}
                    </p>
                    <span
                      className={
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ' +
                        meta.cls
                      }
                    >
                      {meta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <p className="text-[11px] uppercase tracking-wider text-muted mb-3">
            De la comunidad
          </p>
          <GaleriaGrid posts={aprobadas} />
        </section>

        <Link href="/" className="mt-8 block lg:inline-block">
          <Button variant="secondary" className="w-full lg:w-auto">
            Volver
          </Button>
        </Link>
      </div>
    </main>
  )
}
