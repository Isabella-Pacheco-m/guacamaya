import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  updateRecompensa,
  RecompensaNotFoundError,
} from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
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

  const { nombre, descripcion, costo_puntos, activa, imagen_url } =
    (body ?? {}) as {
      nombre?: unknown
      descripcion?: unknown
      costo_puntos?: unknown
      activa?: unknown
      imagen_url?: unknown
    }

  if (nombre !== undefined && typeof nombre !== 'string') {
    return NextResponse.json(
      { error: 'nombre debe ser string' },
      { status: 400 }
    )
  }
  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return NextResponse.json(
      { error: 'descripcion debe ser string o null' },
      { status: 400 }
    )
  }
  if (
    costo_puntos !== undefined &&
    (typeof costo_puntos !== 'number' ||
      !Number.isInteger(costo_puntos) ||
      costo_puntos <= 0)
  ) {
    return NextResponse.json(
      { error: 'costo_puntos debe ser entero positivo' },
      { status: 400 }
    )
  }
  if (activa !== undefined && typeof activa !== 'boolean') {
    return NextResponse.json(
      { error: 'activa debe ser boolean' },
      { status: 400 }
    )
  }
  if (imagen_url !== undefined && imagen_url !== null && typeof imagen_url !== 'string') {
    return NextResponse.json(
      { error: 'imagen_url debe ser string o null' },
      { status: 400 }
    )
  }

  try {
    const recompensa = await updateRecompensa(auth.tenantId, params.id, {
      nombre: typeof nombre === 'string' ? nombre.trim() : null,
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : null,
      costo_puntos: typeof costo_puntos === 'number' ? costo_puntos : null,
      activa: typeof activa === 'boolean' ? activa : null,
      imagen_url: typeof imagen_url === 'string' ? imagen_url.trim() : null,
    })
    return NextResponse.json({ recompensa })
  } catch (err) {
    if (err instanceof RecompensaNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('PATCH /api/recompensas/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
