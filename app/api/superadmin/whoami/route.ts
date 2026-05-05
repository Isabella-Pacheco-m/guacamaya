import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'

export const dynamic = 'force-dynamic'

const NS = 'https://guacamaya.net/'

// Endpoint de diagnóstico: refleja exactamente lo que `isSuperadmin()` ve
// desde un Route Handler (mismo entorno que /api/superadmin/tenants POST).
// Nos sirve para identificar si la falla es de cookie, de claim, de env, o
// de lógica. Borrar este archivo cuando el problema esté cerrado.
export async function GET() {
  const session = await getSession()
  const raw = process.env.SUPERADMIN_EMAILS ?? ''
  const allowed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)

  const user = (session?.user ?? null) as Record<string, unknown> | null
  const email = user?.email ? String(user.email).toLowerCase() : null

  return NextResponse.json({
    has_session: !!user,
    email,
    email_verified: user?.email_verified ?? null,
    tenantId_claim: user ? user[NS + 'tenantId'] ?? null : null,
    miembroId_claim: user ? user[NS + 'miembroId'] ?? null : null,
    user_keys: user ? Object.keys(user).sort() : [],
    env: {
      SUPERADMIN_EMAILS_set: !!raw,
      SUPERADMIN_EMAILS_count: allowed.length,
      SUPERADMIN_EMAILS_values: allowed,
    },
    check: {
      has_user: !!user,
      no_tenant_claim: user ? !user[NS + 'tenantId'] : null,
      no_miembro_claim: user ? !user[NS + 'miembroId'] : null,
      email_verified: !!user?.email_verified,
      email_in_allowlist: email ? allowed.includes(email) : null,
    },
  })
}
