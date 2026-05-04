import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { registerCanje, CanjeError } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// MVP: el admin del tenant procesa canjes desde el mostrador.
// El flujo de canje self-service desde la PWA del cliente queda para cuando
// implementemos el login PWA con miembroId resuelto en el JWT.
export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { miembro_id, recompensa_id } = (body ?? {}) as {
    miembro_id?: unknown
    recompensa_id?: unknown
  }
  if (typeof miembro_id !== 'string' || !UUID_RE.test(miembro_id)) {
    return NextResponse.json(
      { error: 'miembro_id debe ser uuid' },
      { status: 400 }
    )
  }
  if (typeof recompensa_id !== 'string' || !UUID_RE.test(recompensa_id)) {
    return NextResponse.json(
      { error: 'recompensa_id debe ser uuid' },
      { status: 400 }
    )
  }

  try {
    const result = await registerCanje(auth.tenantId, miembro_id, recompensa_id)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof CanjeError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/canjes', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
