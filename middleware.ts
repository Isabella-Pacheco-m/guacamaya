import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = 'guacamaya.net'

// Rate limiting básico en memoria, solo para /api. Es best-effort: el estado
// vive por isolate del edge, no es compartido. Para límites distribuidos y
// persistentes, mover a Vercel WAF o Upstash Redis.
const RATE_WINDOW_MS = 20_000
const RATE_MAX = 60
const rateHits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateHits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    if (rateHits.size > 10_000) {
      for (const [k, v] of rateHits) if (now > v.resetAt) rateHits.delete(k)
    }
    return false
  }
  entry.count += 1
  return entry.count > RATE_MAX
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip =
      req.ip ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
    }
  }

  const host = (req.headers.get('host') ?? '').split(':')[0]

  let tenantSlug = ''

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    if (host.endsWith(`.${ROOT_DOMAIN}`)) {
      const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1)
      if (sub && sub !== 'www') {
        tenantSlug = sub.split('.')[0]
      }
    } else if (host.endsWith('.localhost')) {
      const sub = host.slice(0, host.length - 'localhost'.length - 1)
      if (sub && sub !== 'www') {
        tenantSlug = sub.split('.')[0]
      }
    } else {
      const parts = host.split('.')
      if (parts.length >= 3 && parts[0] !== 'www') {
        tenantSlug = parts[0]
      }
    }
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)
  // Pathname original — lo usa requireCliente() para redirigir cross-host
  // al subdominio del miembro preservando el deep-link después del callback
  // de Auth0 (que siempre vuelve al apex).
  requestHeaders.set('x-pathname', req.nextUrl.pathname)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-).*)'],
}
