import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ROOT_DOMAIN = 'guacamaya.net'

// Rate limiting por IP en /api con Upstash Redis (distribuido entre instancias).
// Límite estricto en el redeem de invitaciones por ser objetivo de fuerza bruta
// de tokens. Si faltan las env vars (dev sin credenciales), cae a un limitador
// en memoria best-effort para no bloquear el desarrollo local.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      prefix: 'rl:api',
      ephemeralCache: new Map(),
    })
  : null

const redeemLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'rl:redeem',
      ephemeralCache: new Map(),
    })
  : null

// Fallback en memoria (best-effort, por isolate) cuando no hay Upstash.
const memHits = new Map<string, { count: number; resetAt: number }>()
function memLimited(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = memHits.get(ip)
  if (!entry || now > entry.resetAt) {
    memHits.set(ip, { count: 1, resetAt: now + windowMs })
    if (memHits.size > 10_000) {
      for (const [k, v] of memHits) if (now > v.resetAt) memHits.delete(k)
    }
    return false
  }
  entry.count += 1
  return entry.count > max
}

function clientIp(req: NextRequest): string {
  return req.ip ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    const ip = clientIp(req)
    const isRedeem = pathname.startsWith('/api/invitaciones/redeem')
    const limiter = isRedeem ? redeemLimiter : apiLimiter

    let limited: boolean
    if (limiter) {
      limited = !(await limiter.limit(ip)).success
    } else {
      limited = isRedeem ? memLimited(`r:${ip}`, 10, 60_000) : memLimited(ip, 100, 60_000)
    }
    if (limited) {
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
  // Pathname + query originales — los usan requireCliente()/requireAdmin()
  // para redirigir cross-host al subdominio preservando el deep-link (p.ej.
  // el QR de canje /admin/canjes/confirmar?m=..&r=..) después del callback de
  // Auth0, que siempre vuelve al apex.
  requestHeaders.set('x-pathname', req.nextUrl.pathname)
  requestHeaders.set('x-search', req.nextUrl.search)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-).*)'],
}
