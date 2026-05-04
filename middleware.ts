import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = 'guacamaya.net'

export function middleware(req: NextRequest) {
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

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-).*)'],
}
