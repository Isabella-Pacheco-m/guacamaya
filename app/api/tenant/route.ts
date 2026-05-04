import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  getTenantFromRequest,
  TenantNotFoundError,
  TenantUpdateError,
  updateTenant,
} from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tenant = await getTenantFromRequest()
    return NextResponse.json(tenant)
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('GET /api/tenant', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { nombre, color_primario, puntos_cumpleanos } = (body ?? {}) as {
    nombre?: unknown
    color_primario?: unknown
    puntos_cumpleanos?: unknown
  }

  if (nombre !== undefined && typeof nombre !== 'string') {
    return NextResponse.json(
      { error: 'nombre debe ser string' },
      { status: 400 }
    )
  }
  if (color_primario !== undefined && typeof color_primario !== 'string') {
    return NextResponse.json(
      { error: 'color_primario debe ser string' },
      { status: 400 }
    )
  }
  if (
    puntos_cumpleanos !== undefined &&
    puntos_cumpleanos !== null &&
    typeof puntos_cumpleanos !== 'number'
  ) {
    return NextResponse.json(
      { error: 'puntos_cumpleanos debe ser número o null' },
      { status: 400 }
    )
  }

  try {
    const tenant = await updateTenant(auth.tenantId, {
      nombre: nombre as string | undefined,
      color_primario: color_primario as string | undefined,
      puntos_cumpleanos: puntos_cumpleanos as number | null | undefined,
    })
    return NextResponse.json({ tenant })
  } catch (err) {
    if (err instanceof TenantUpdateError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('PATCH /api/tenant', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
