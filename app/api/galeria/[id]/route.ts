import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  aprobarGaleriaPost,
  rechazarGaleriaPost,
  GaleriaError,
} from '@/lib/galeria'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Moderación: aprobar (con puntos) o rechazar una foto de la galería.
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
  const { accion, puntos } = (body ?? {}) as {
    accion?: unknown
    puntos?: unknown
  }

  try {
    if (accion === 'rechazar') {
      const post = await rechazarGaleriaPost(auth.tenantId, params.id)
      return NextResponse.json({ post })
    }
    if (accion === 'aprobar') {
      if (
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
      const result = await aprobarGaleriaPost(
        auth.tenantId,
        params.id,
        typeof puntos === 'number' ? puntos : 0
      )
      return NextResponse.json(result)
    }
    return NextResponse.json(
      { error: "accion debe ser 'aprobar' o 'rechazar'" },
      { status: 400 }
    )
  } catch (err) {
    if (err instanceof GaleriaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/galeria/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
