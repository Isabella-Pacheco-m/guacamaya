import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getMiembroById } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  try {
    const miembro = await getMiembroById(auth.tenantId, params.id)
    if (!miembro) {
      return NextResponse.json(
        { error: 'Miembro no encontrado' },
        { status: 404 }
      )
    }
    return NextResponse.json({ miembro })
  } catch (err) {
    console.error('GET /api/miembros/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
