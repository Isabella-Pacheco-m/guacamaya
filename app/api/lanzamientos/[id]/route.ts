import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  setLanzamientoEstado,
  deleteLanzamiento,
  deleteLanzamientoBanner,
  LanzamientoError,
  type LanzamientoEstado,
} from '@/lib/lanzamientos'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESTADOS: LanzamientoEstado[] = ['teaser', 'activo', 'finalizado']

export async function PATCH(
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
  const { estado } = (body ?? {}) as { estado?: unknown }
  if (typeof estado !== 'string' || !ESTADOS.includes(estado as LanzamientoEstado)) {
    return NextResponse.json(
      { error: `estado debe ser uno de: ${ESTADOS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const lanzamiento = await setLanzamientoEstado(
      auth.tenantId,
      params.id,
      estado as LanzamientoEstado
    )
    return NextResponse.json({ lanzamiento })
  } catch (err) {
    if (err instanceof LanzamientoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('PATCH /api/lanzamientos/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  try {
    const bannerUrl = await deleteLanzamiento(auth.tenantId, params.id)
    if (bannerUrl) await deleteLanzamientoBanner(bannerUrl)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof LanzamientoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('DELETE /api/lanzamientos/[id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
