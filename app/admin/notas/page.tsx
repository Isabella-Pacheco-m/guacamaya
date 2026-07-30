import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listNotas } from '@/lib/tenantQueries'
import { NotasAdminPanel } from '@/components/admin/NotasAdminPanel'
import { PageHeader } from '@/components/admin/PageHeader'

export const dynamic = 'force-dynamic'

export default async function NotasPage() {
  const { tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  if (!features.notas_enabled) {
    redirect('/admin/funcionalidades')
  }
  const notas = await listNotas(tenantId)

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <PageHeader
        eyebrow="Contenido"
        tone="oliva"
        titulo="Notas"
        descripcion={
          <>
            Mensajes cortos tipo post-it que tu comunidad ve en la PWA. Úsalas
            para avisos, horarios especiales o un mensaje del día. Fija las
            importantes para que salgan primero.
          </>
        }
      />

      <NotasAdminPanel initial={notas} />
    </div>
  )
}
