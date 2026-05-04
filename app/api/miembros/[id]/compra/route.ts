import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { registerCompra, CompraError } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { monto_cop } = (body ?? {}) as { monto_cop?: unknown }
  if (
    typeof monto_cop !== 'number' ||
    !Number.isInteger(monto_cop) ||
    monto_cop <= 0
  ) {
    return NextResponse.json(
      { error: 'monto_cop debe ser entero positivo' },
      { status: 400 }
    )
  }

  try {
    const result = await registerCompra(auth.tenantId, params.id, monto_cop)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof CompraError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/miembros/[id]/compra', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
