import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId } from '@/lib/auth0'
import { getTenantBySlug } from '@/lib/tenant'
import { redeemInvitacion, InvitacionError } from '@/lib/invitaciones'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession(req, new NextResponse())
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  // Un admin del tenant no debería vincular su Auth0 a un perfil de miembro.
  if (getTenantId(session.user)) {
    return NextResponse.json(
      { error: 'Operación reservada a clientes' },
      { status: 403 }
    )
  }

  const slug = headers().get('x-tenant-slug')
  if (!slug) {
    return NextResponse.json(
      { error: 'Subdominio del negocio inválido' },
      { status: 400 }
    )
  }
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const { token } = (body ?? {}) as { token?: unknown }
  if (typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const auth0UserId = session.user.sub as string
  if (!auth0UserId) {
    return NextResponse.json({ error: 'Sesión sin sub' }, { status: 400 })
  }

  try {
    const result = await redeemInvitacion(tenant.id, token, auth0UserId)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof InvitacionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/invitaciones/redeem', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
