import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId, readSession } from '@/lib/api-auth'
import { cancelarSuscripciones, SuscripcionError } from '@/lib/suscripciones'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Desuscripción desde el panel del negocio. Marca las suscripciones del email
// admin como CANCELADA — con eso el guard de admin bloquea la cuenta en la
// siguiente petición (el propio panel deja de ser accesible).
export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const session = await readSession(req)
  const email = String(session?.user?.email ?? '').toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Sesión sin email' }, { status: 401 })
  }

  try {
    await cancelarSuscripciones(email)
  } catch (err) {
    if (err instanceof SuscripcionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
