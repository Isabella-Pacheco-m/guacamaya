import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { createInvitacion, InvitacionError } from '@/lib/invitaciones'
import { inviteUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { miembro_id, ttl_days } = (body ?? {}) as {
    miembro_id?: unknown
    ttl_days?: unknown
  }
  if (typeof miembro_id !== 'string' || !UUID_RE.test(miembro_id)) {
    return NextResponse.json(
      { error: 'miembro_id debe ser uuid' },
      { status: 400 }
    )
  }
  let ttl = 30
  if (ttl_days !== undefined) {
    if (!Number.isInteger(ttl_days) || (ttl_days as number) <= 0 || (ttl_days as number) > 365) {
      return NextResponse.json(
        { error: 'ttl_days debe ser entero entre 1 y 365' },
        { status: 400 }
      )
    }
    ttl = ttl_days as number
  }

  try {
    const { invitacion, token } = await createInvitacion(
      auth.tenantId,
      miembro_id,
      ttl
    )
    return NextResponse.json(
      {
        id: invitacion.id,
        url: inviteUrl(token),
        expires_at: invitacion.expires_at,
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof InvitacionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/invitaciones', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
