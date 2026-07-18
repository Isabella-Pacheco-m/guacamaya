import { NextResponse, type NextRequest } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listGaleriaAprobadas, GALERIA_PAGE_SIZE } from '@/lib/galeria'

export const dynamic = 'force-dynamic'

// Página siguiente del scroll infinito de la galería.
// ?before=<ISO del created_at del último item ya mostrado>
export async function GET(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenant.id)
  if (!features.galeria_enabled) {
    return NextResponse.json({ error: 'Galería no habilitada' }, { status: 403 })
  }

  const raw = new URL(req.url).searchParams.get('before')
  let before: string | null = null
  if (raw) {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'before inválido' }, { status: 400 })
    }
    before = d.toISOString()
  }

  const posts = await listGaleriaAprobadas(auth.tenant.id, GALERIA_PAGE_SIZE, before)
  return NextResponse.json({
    posts,
    // El cliente para de pedir cuando llega una página incompleta.
    hasMore: posts.length === GALERIA_PAGE_SIZE,
  })
}
