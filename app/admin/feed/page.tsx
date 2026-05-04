import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listFeedPosts } from '@/lib/feed'
import { FeedAdminPanel } from '@/components/admin/FeedAdminPanel'

export const dynamic = 'force-dynamic'

export default async function FeedAdminPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.feed_enabled) {
    redirect('/admin/funcionalidades')
  }

  const posts = await listFeedPosts(tenantId)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">Feed</h1>
        <p className="text-muted text-sm mt-2">
          Publica novedades, eventos y contenido para tus miembros.
        </p>
      </div>
      <FeedAdminPanel initial={posts} />
    </div>
  )
}
