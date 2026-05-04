import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { listRecompensas, createRecompensa } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  try {
    const recompensas = await listRecompensas(auth.tenantId)
    return NextResponse.json({ recompensas })
  } catch (err) {
    console.error('GET /api/recompensas', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { nombre, costo_puntos, descripcion, imagen_url } = (body ?? {}) as {
    nombre?: unknown
    costo_puntos?: unknown
    descripcion?: unknown
    imagen_url?: unknown
  }
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return NextResponse.json(
      { error: 'nombre es requerido' },
      { status: 400 }
    )
  }
  if (
    typeof costo_puntos !== 'number' ||
    !Number.isInteger(costo_puntos) ||
    costo_puntos <= 0
  ) {
    return NextResponse.json(
      { error: 'costo_puntos debe ser entero positivo' },
      { status: 400 }
    )
  }
  if (descripcion != null && typeof descripcion !== 'string') {
    return NextResponse.json(
      { error: 'descripcion debe ser string' },
      { status: 400 }
    )
  }
  if (imagen_url != null && typeof imagen_url !== 'string') {
    return NextResponse.json(
      { error: 'imagen_url debe ser string' },
      { status: 400 }
    )
  }

  try {
    const recompensa = await createRecompensa(auth.tenantId, {
      nombre: nombre.trim(),
      costo_puntos,
      descripcion: (descripcion as string | undefined)?.trim() || null,
      imagen_url: (imagen_url as string | undefined)?.trim() || null,
    })
    return NextResponse.json({ recompensa }, { status: 201 })
  } catch (err) {
    console.error('POST /api/recompensas', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
