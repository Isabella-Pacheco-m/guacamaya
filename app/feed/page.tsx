import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCliente } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listFeedPosts } from '@/lib/feed'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { FeedPostCard } from '@/components/pwa/FeedPostCard'

export const dynamic = 'force-dynamic'

export default async function FeedPwaPage() {
  const { tenant } = await requireCliente()
  const features = await getTenantFeatures(tenant.id)
  if (!features.feed_enabled) redirect('/')

  const posts = await listFeedPosts(tenant.id)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <div className="px-6 py-10 max-w-md mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-8">
          <Link href="/" className="text-xs text-electric hover:underline">
            ← {tenant.nombre}
          </Link>
          <h1 className="text-2xl font-light mt-1 leading-tight">Novedades</h1>
          <p className="text-sm text-muted mt-1.5">
            Lo último de {tenant.nombre}.
          </p>
        </header>

        {posts.length === 0 ? (
          <Card className="text-center" padding="lg">
            <p className="text-sm text-muted">
              Aún no hay publicaciones. Vuelve pronto.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((p) => (
              <FeedPostCard key={p.id} post={p} />
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
