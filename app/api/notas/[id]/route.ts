import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { deleteNota, NotaError } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  try {
    await deleteNota(auth.tenantId, params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NotaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('DELETE /api/notas/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
