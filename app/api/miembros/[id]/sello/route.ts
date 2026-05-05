import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { registerSello, TarjetaError } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.tarjeta_enabled) {
    return NextResponse.json(
      { error: 'Tarjeta no habilitada' },
      { status: 403 }
    )
  }

  try {
    const miembro = await registerSello(auth.tenantId, params.id, 1)
    return NextResponse.json({ miembro })
  } catch (err) {
    if (err instanceof TarjetaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/miembros/[id]/sello', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
