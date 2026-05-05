import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  upsertTarjetaPremio,
  deleteTarjetaPremio,
  TarjetaError,
} from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

// PUT: upsert (threshold + descripcion)
export async function PUT(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { threshold, descripcion } = body as {
    threshold?: unknown
    descripcion?: unknown
  }
  if (
    typeof threshold !== 'number' ||
    !Number.isInteger(threshold) ||
    threshold < 1 ||
    threshold > 100
  ) {
    return NextResponse.json(
      { error: 'threshold debe ser entero entre 1 y 100' },
      { status: 400 }
    )
  }
  if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
    return NextResponse.json(
      { error: 'descripcion no puede estar vacía' },
      { status: 400 }
    )
  }
  if (descripcion.length > 200) {
    return NextResponse.json(
      { error: 'descripcion máximo 200 caracteres' },
      { status: 400 }
    )
  }

  try {
    await upsertTarjetaPremio(auth.tenantId, threshold, descripcion)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof TarjetaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

// DELETE: ?threshold=N
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const url = new URL(req.url)
  const raw = url.searchParams.get('threshold')
  const threshold = Number(raw)
  if (!Number.isInteger(threshold) || threshold < 1) {
    return NextResponse.json(
      { error: 'threshold debe ser entero positivo' },
      { status: 400 }
    )
  }
  await deleteTarjetaPremio(auth.tenantId, threshold)
  return NextResponse.json({ ok: true })
}
