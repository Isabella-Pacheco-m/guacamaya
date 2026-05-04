import { NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  deleteSorteo,
  deleteSorteoFiles,
  SorteoError,
} from '@/lib/sorteos'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }
  try {
    const files = await deleteSorteo(auth.tenantId, params.id)
    await deleteSorteoFiles(files)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof SorteoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
