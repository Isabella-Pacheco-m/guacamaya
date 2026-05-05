import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { listMiembros, createMiembro } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  try {
    const miembros = await listMiembros(auth.tenantId)
    return NextResponse.json({ miembros })
  } catch (err) {
    console.error('GET /api/miembros', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { nombre, telefono, email } = (body ?? {}) as {
    nombre?: unknown
    telefono?: unknown
    email?: unknown
  }
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return NextResponse.json(
      { error: 'nombre es requerido' },
      { status: 400 }
    )
  }
  if (telefono != null && typeof telefono !== 'string') {
    return NextResponse.json(
      { error: 'telefono debe ser string' },
      { status: 400 }
    )
  }
  if (email != null && typeof email !== 'string') {
    return NextResponse.json(
      { error: 'email debe ser string' },
      { status: 400 }
    )
  }

  try {
    const miembro = await createMiembro(auth.tenantId, {
      nombre: nombre.trim(),
      telefono: (telefono as string | undefined)?.trim() || null,
      email: (email as string | undefined)?.trim() || null,
    })
    return NextResponse.json({ miembro }, { status: 201 })
  } catch (err) {
    console.error('POST /api/miembros', err)
    const message =
      err instanceof Error && /duplicate|unique/i.test(err.message)
        ? 'Ya existe un miembro con ese teléfono'
        : 'Error interno'
    const status = message.startsWith('Ya') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
