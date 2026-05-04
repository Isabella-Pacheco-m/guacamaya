import { NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { pickSorteoWinner, SorteoError } from '@/lib/sorteos'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  let miembroId: string | null = null
  try {
    const body = (await req.json().catch(() => ({}))) as { miembro_id?: string | null }
    if (body.miembro_id) {
      if (!UUID_RE.test(body.miembro_id)) {
        return NextResponse.json({ error: 'miembro_id inválido' }, { status: 400 })
      }
      miembroId = body.miembro_id
    }
  } catch {
    // body opcional
  }

  try {
    const sorteo = await pickSorteoWinner(auth.tenantId, params.id, miembroId)
    return NextResponse.json({ sorteo })
  } catch (err) {
    if (err instanceof SorteoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
