import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { closeSorteo, SorteoError } from '@/lib/sorteos'

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
  try {
    const sorteo = await closeSorteo(auth.tenantId, params.id)
    return NextResponse.json({ sorteo })
  } catch (err) {
    if (err instanceof SorteoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
