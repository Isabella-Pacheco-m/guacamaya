import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@auth0/nextjs-auth0'
import { isSuperadmin } from '@/lib/superadmin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NS = 'https://guacamaya.net/'

// Endpoint de diagnóstico: refleja exactamente lo que `isSuperadmin()` ve
// desde un Route Handler (mismo entorno que /api/superadmin/tenants POST).
// Compara los TRES caminos posibles para leer la sesión y cuáles cookies
// llegaron — eso nos dice si el problema es de cookie o de SDK. Borrar este
// archivo cuando el problema esté cerrado.
export async function GET(req: NextRequest) {
  // 1) cookies tal y como las ve next/headers
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll().map((c) => c.name).sort()
  const auth0CookieNames = allCookies.filter(
    (n) => n === 'appSession' || n.startsWith('appSession.')
  )

  // 2) cookies tal y como las ve el NextRequest (otra ruta)
  const reqCookies = req.cookies
    .getAll()
    .map((c) => c.name)
    .sort()

  // 3) Probar las dos firmas de getSession
  let sessionA: any = null
  let errA: string | null = null
  try {
    sessionA = await getSession()
  } catch (e: any) {
    errA = e?.message ?? String(e)
  }

  let sessionB: any = null
  let errB: string | null = null
  try {
    sessionB = await getSession(req, new NextResponse())
  } catch (e: any) {
    errB = e?.message ?? String(e)
  }

  const raw = process.env.SUPERADMIN_EMAILS ?? ''
  const allowed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)

  const summarize = (s: any) => {
    if (!s?.user) return { has_user: false }
    const u = s.user as Record<string, unknown>
    return {
      has_user: true,
      email: typeof u.email === 'string' ? u.email.toLowerCase() : null,
      email_verified: u.email_verified ?? null,
      tenantId_claim: u[NS + 'tenantId'] ?? null,
      miembroId_claim: u[NS + 'miembroId'] ?? null,
      keys: Object.keys(u).sort(),
    }
  }

  return NextResponse.json({
    cookies: {
      via_next_headers: allCookies,
      via_next_request: reqCookies,
      auth0_cookie_present: auth0CookieNames,
    },
    session_no_args: { ...summarize(sessionA), error: errA },
    session_with_req_res: { ...summarize(sessionB), error: errB },
    env: {
      SUPERADMIN_EMAILS_set: !!raw,
      SUPERADMIN_EMAILS_count: allowed.length,
      SUPERADMIN_EMAILS_values: allowed,
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL ?? null,
      AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL ?? null,
      AUTH0_COOKIE_DOMAIN: process.env.AUTH0_COOKIE_DOMAIN ?? null,
    },
    request: {
      method: req.method,
      url: req.url,
      host: req.headers.get('host'),
      x_forwarded_host: req.headers.get('x-forwarded-host'),
      x_forwarded_proto: req.headers.get('x-forwarded-proto'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
    },
  })
}

// Mismo análisis pero por POST — el form de "Crear negocio" hace POST y eso
// es lo que está fallando con 403. Si esto devuelve has_user:true entonces
// el bug NO es la cookie/sesión y hay que mirar otro punto del POST handler.
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll().map((c) => c.name).sort()

  let sessionB: any = null
  let errB: string | null = null
  try {
    sessionB = await getSession(req, new NextResponse())
  } catch (e: any) {
    errB = e?.message ?? String(e)
  }

  let isAdmin = false
  let isAdminErr: string | null = null
  try {
    isAdmin = await isSuperadmin(req)
  } catch (e: any) {
    isAdminErr = e?.message ?? String(e)
  }

  const raw = process.env.SUPERADMIN_EMAILS ?? ''
  const allowed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)

  return NextResponse.json({
    cookies: { via_next_headers: allCookies },
    session_with_req_res: sessionB?.user
      ? {
          has_user: true,
          email: String(sessionB.user.email ?? '').toLowerCase(),
          email_verified: sessionB.user.email_verified,
          tenantId_claim: sessionB.user[NS + 'tenantId'] ?? null,
          miembroId_claim: sessionB.user[NS + 'miembroId'] ?? null,
        }
      : { has_user: false, error: errB },
    isSuperadmin: { result: isAdmin, error: isAdminErr },
    env: {
      SUPERADMIN_EMAILS_values: allowed,
    },
    request: {
      method: req.method,
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      host: req.headers.get('host'),
    },
  })
}
