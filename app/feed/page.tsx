import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listFeedPosts } from '@/lib/feed'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { FeedPostCard } from '@/components/pwa/FeedPostCard'
import { FeedComposer } from '@/components/pwa/FeedComposer'

export const dynamic = 'force-dynamic'

export default async function FeedPwaPage() {
  const { tenant, miembro } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.feed_enabled) redirect('/')

  const posts = await listFeedPosts(tenant.id)
  const puedePublicar = features.feed_miembros_pueden_publicar

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 lg:py-14 max-w-md lg:max-w-2xl mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-6">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← Inicio
          </Link>
          <div className="mt-3 flex items-center gap-3.5">
            {tenant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.nombre}
                className="h-14 w-14 rounded-2xl object-contain bg-white p-1.5 ring-2 ring-electric/30 shadow-sm shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-electric">
                Comunidad
              </p>
              <h1 className="text-2xl font-light leading-tight tracking-tight truncate">
                {tenant.nombre}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted mt-3">
            {puedePublicar
              ? `Novedades de ${tenant.nombre} y su comunidad.`
              : `Lo último de ${tenant.nombre}.`}
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {puedePublicar && (
            <FeedComposer
              miembroNombre={miembro.nombre}
              miembroAvatarUrl={miembro.avatar_url}
            />
          )}

          {posts.length === 0 ? (
            <Card className="text-center" padding="lg">
              <p className="text-sm text-muted">
                {puedePublicar
                  ? 'Aún no hay publicaciones. ¡Sé el primero en compartir!'
                  : 'Aún no hay publicaciones. Vuelve pronto.'}
              </p>
            </Card>
          ) : (
            posts.map((p) => (
              <FeedPostCard key={p.id} post={p} tenant={tenant} />
            ))
          )}
        </div>

        <Link href="/" className="mt-8 block lg:inline-block">
          <Button variant="secondary" className="w-full lg:w-auto">
            Volver
          </Button>
        </Link>
      </div>
    </main>
  )
}
