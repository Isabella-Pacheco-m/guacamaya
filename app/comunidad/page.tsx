import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listNotas } from '@/lib/tenantQueries'
import { listFeedPosts } from '@/lib/feed'
import { listGaleriaAprobadas, GALERIA_PAGE_SIZE } from '@/lib/galeria'
import { listRetosPwa } from '@/lib/retos'
import { listSorteosActivos } from '@/lib/sorteos'
import { listLanzamientosPwa } from '@/lib/lanzamientos'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { ComunidadTabs, type TabId } from '@/components/pwa/ComunidadTabs'

export const dynamic = 'force-dynamic'

const TABS: TabId[] = ['todo', 'novedades', 'galeria', 'retos', 'sorteos', 'lanzamientos']

export default async function ComunidadPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const { tenant, miembro } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)

  const enabled = {
    novedades: features.feed_enabled,
    galeria: features.galeria_enabled,
    retos: features.retos_enabled,
    sorteos: features.sorteos_enabled,
    lanzamientos: features.lanzamientos_enabled,
  }
  // Si la marca no activó nada de comunidad, no hay sección que mostrar.
  const algoActivo =
    Object.values(enabled).some(Boolean) || features.notas_enabled
  if (!algoActivo) redirect('/')

  // Se carga todo de una: al cambiar de pestaña no hay ida y vuelta al server.
  const [notas, posts, galeria, retos, sorteos, lanzamientos] = await Promise.all([
    features.notas_enabled ? listNotas(tenant.id, 6) : Promise.resolve([]),
    features.feed_enabled ? listFeedPosts(tenant.id, 30) : Promise.resolve([]),
    features.galeria_enabled
      ? listGaleriaAprobadas(tenant.id, GALERIA_PAGE_SIZE)
      : Promise.resolve([]),
    features.retos_enabled ? listRetosPwa(tenant.id) : Promise.resolve([]),
    features.sorteos_enabled ? listSorteosActivos(tenant.id) : Promise.resolve([]),
    features.lanzamientos_enabled
      ? listLanzamientosPwa(tenant.id)
      : Promise.resolve([]),
  ])

  const raw = searchParams.tab
  const initialTab: TabId = TABS.includes(raw as TabId) ? (raw as TabId) : 'todo'

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 pb-14 max-w-md lg:max-w-2xl mx-auto">
        <TenantTheme color={tenant.color_primario} />

        <header className="pt-10 pb-5">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← Inicio
          </Link>
          <div className="mt-3 flex items-center gap-3.5">
            {tenant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt=""
                className="h-12 w-12 rounded-2xl object-contain bg-white p-1.5 ring-1 ring-border shadow-sm shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-light leading-tight tracking-tight">
                Comunidad
              </h1>
              <p className="text-sm text-muted truncate">{tenant.nombre}</p>
            </div>
          </div>
        </header>

        <ComunidadTabs
          tenant={tenant}
          miembro={miembro}
          data={{
            notas,
            posts,
            galeria: {
              initial: galeria,
              hasMore: galeria.length === GALERIA_PAGE_SIZE,
            },
            retos,
            sorteos,
            lanzamientos,
          }}
          enabled={enabled}
          puedePublicar={features.feed_miembros_pueden_publicar}
          galeriaPuntos={features.galeria_puntos}
          initialTab={initialTab}
        />
      </div>
    </main>
  )
}
