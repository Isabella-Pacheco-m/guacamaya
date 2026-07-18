import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listNotas } from '@/lib/tenantQueries'
import { NotasAdminPanel } from '@/components/admin/NotasAdminPanel'

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
      <div>
        <h1 className="text-[44px] font-light tracking-tight leading-tight">
          Notas
        </h1>
        <p className="text-muted text-sm mt-2">
          Mensajes cortos tipo post-it que tu comunidad ve en la PWA. Úsalas para
          avisos, horarios especiales o un mensaje del día. Fija las importantes
          para que salgan primero.
        </p>
      </div>

      <NotasAdminPanel initial={notas} />
    </div>
  )
}
