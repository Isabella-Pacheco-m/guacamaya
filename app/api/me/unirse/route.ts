import { NextResponse, type NextRequest } from 'next/server'
import { readSession } from '@/lib/api-auth'
import { getTenantFromRequest, TenantNotFoundError } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import { selfRegisterMiembro } from '@/lib/invitaciones'

export const dynamic = 'force-dynamic'

// Auto-registro del cliente en la comunidad del subdominio. Solo funciona si el
// tenant tiene `registro_abierto`. El tenant se resuelve del host (x-tenant-slug),
// la identidad del usuario logueado (sin claim de Auth0 — DB-based por sub).
export async function POST(req: NextRequest) {
  const session = await readSession(req)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let tenant
  try {
    tenant = await getTenantFromRequest()
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    throw err
  }

  const features = await getTenantFeatures(tenant.id)
  if (!features.registro_abierto) {
    return NextResponse.json(
      { error: 'Esta comunidad es por invitación' },
      { status: 403 }
    )
  }

  const auth0UserId = session.user.sub as string | undefined
  if (!auth0UserId) {
    return NextResponse.json({ error: 'Sesión sin identificador' }, { status: 401 })
  }

  const nombre =
    (session.user.name as string) ||
    (session.user.nickname as string) ||
    (session.user.email as string) ||
    'Cliente'
  const email = (session.user.email as string | undefined) ?? null

  try {
    const miembro = await selfRegisterMiembro(tenant.id, auth0UserId, nombre, email)
    return NextResponse.json({ miembro })
  } catch (err) {
    console.error('POST /api/me/unirse', err)
    return NextResponse.json({ error: 'No pudimos completar tu registro' }, { status: 500 })
  }
}
