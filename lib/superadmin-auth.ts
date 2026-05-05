import { redirect } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'

// En App Router Route Handlers, `getSession()` sin args no detecta la cookie
// (bug conocido de @auth0/nextjs-auth0 v3 + Next 14). Para Route Handlers hay
// que pasar req+res explícitos. Server Components siguen funcionando sin args.
async function readSession(req?: NextRequest) {
  if (req) return getSession(req, new NextResponse())
  return getSession()
}

// Allow-list de emails con acceso al panel del superadmin. Modelo simple
// mientras no haya un claim Auth0 dedicado. Para acceder, además de estar
// en la lista, el usuario tiene que tener `email_verified=true` en su
// sesión (set por Auth0 desde el IDP del usuario).
function getAllowedEmails(): Set<string> {
  const raw = process.env.SUPERADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
  )
}

export interface SuperadminContext {
  email: string
  user: {
    name?: string
    email: string
    picture?: string
    sub: string
  }
}

/**
 * Server-side: garantiza que la sesión es de un superadmin (email en
 * SUPERADMIN_EMAILS + email_verified). Falla con redirect si no.
 *
 * Reglas:
 *  - sin sesión → /api/auth/login
 *  - admin de tenant (tiene tenantId claim) → /admin/dashboard (su scope)
 *  - cliente (tiene miembroId claim) → / (no autorizado)
 *  - email no en allow-list → / con error
 *  - email no verificado → / con error
 */
export async function requireSuperadmin(req?: NextRequest): Promise<SuperadminContext> {
  const session = await readSession(req)
  if (!session?.user) {
    redirect('/api/auth/login?returnTo=/superadmin')
  }

  // Admin de tenant: redirect a su panel.
  if (getTenantId(session.user)) {
    redirect('/admin/dashboard')
  }
  // Cliente: redirect a home.
  if (getMiembroId(session.user)) {
    redirect('/?error=not-superadmin')
  }

  const email = String(session.user.email ?? '').toLowerCase()
  const verified = Boolean(session.user.email_verified)
  const allowed = getAllowedEmails()

  if (!email || !verified || !allowed.has(email)) {
    redirect('/?error=not-superadmin')
  }

  return {
    email,
    user: {
      name: session.user.name as string | undefined,
      email,
      picture: session.user.picture as string | undefined,
      sub: session.user.sub as string,
    },
  }
}

/** Para checks en API routes que devuelven JSON, no HTML. */
export async function isSuperadmin(req?: NextRequest): Promise<boolean> {
  const session = await readSession(req)
  if (!session?.user) return false
  if (getTenantId(session.user) || getMiembroId(session.user)) return false
  const email = String(session.user.email ?? '').toLowerCase()
  const verified = Boolean(session.user.email_verified)
  return verified && getAllowedEmails().has(email)
}
