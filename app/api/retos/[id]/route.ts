import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { closeReto, deleteReto, deleteRetoFiles, RetoError } from '@/lib/retos'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// PATCH { estado: 'CERRADO' } cierra el reto.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { estado } = (body ?? {}) as { estado?: unknown }
  if (estado !== 'CERRADO') {
    return NextResponse.json({ error: "estado debe ser 'CERRADO'" }, { status: 400 })
  }
  try {
    const reto = await closeReto(auth.tenantId, params.id)
    return NextResponse.json({ reto })
  } catch (err) {
    if (err instanceof RetoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

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
    const files = await deleteReto(auth.tenantId, params.id)
    await deleteRetoFiles(files)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof RetoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
