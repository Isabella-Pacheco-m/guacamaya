import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { redeemPremioTarjeta, TarjetaError } from '@/lib/tenantQueries'

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { threshold } = (body ?? {}) as { threshold?: unknown }
  if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 1) {
    return NextResponse.json(
      { error: 'threshold debe ser entero positivo' },
      { status: 400 }
    )
  }

  try {
    const miembro = await redeemPremioTarjeta(auth.tenantId, params.id, threshold)
    return NextResponse.json({ miembro })
  } catch (err) {
    if (err instanceof TarjetaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/miembros/[id]/sello/canje', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
