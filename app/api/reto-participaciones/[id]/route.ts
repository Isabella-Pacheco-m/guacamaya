import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { revisarRetoParticipacion, RetoError } from '@/lib/retos'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Admin revisa una participación: cumplir (acredita puntos) o rechazar.
export async function POST(
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
  const { accion, puntos } = (body ?? {}) as { accion?: unknown; puntos?: unknown }

  if (accion !== 'cumplir' && accion !== 'rechazar') {
    return NextResponse.json(
      { error: "accion debe ser 'cumplir' o 'rechazar'" },
      { status: 400 }
    )
  }
  if (
    accion === 'cumplir' &&
    puntos !== undefined &&
    (typeof puntos !== 'number' ||
      !Number.isInteger(puntos) ||
      puntos < 0 ||
      puntos > 100000)
  ) {
    return NextResponse.json(
      { error: 'puntos debe ser entero entre 0 y 100000' },
      { status: 400 }
    )
  }

  try {
    const result = await revisarRetoParticipacion(
      auth.tenantId,
      params.id,
      accion === 'cumplir',
      typeof puntos === 'number' ? puntos : 0
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof RetoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/reto-participaciones/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
