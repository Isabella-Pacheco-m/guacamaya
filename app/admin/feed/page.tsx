import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listFeedPosts } from '@/lib/feed'
import { FeedAdminPanel } from '@/components/admin/FeedAdminPanel'
import { PageHeader } from '@/components/admin/PageHeader'

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
      <PageHeader
        eyebrow="Contenido"
        tone="oliva"
        titulo="Feed"
        descripcion="Publica novedades, eventos y contenido para tus miembros."
      />
      <FeedAdminPanel
        initial={posts}
        miembrosPuedenPublicar={features.feed_miembros_pueden_publicar}
      />
    </div>
  )
}
