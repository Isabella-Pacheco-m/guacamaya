import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import { getTenantBySlug } from '@/lib/tenant'
import { findMiembroByAuth0, getMiembroByAuth0 } from '@/lib/invitaciones'
import { tenantBaseUrl } from '@/lib/config'
import type { Miembro, Tenant } from '@/types'

export interface AdminContext {
  tenantId: string
  user: {
    name?: string
    email?: string
    picture?: string
  }
}

export interface ClienteContext {
  tenant: Tenant
  miembro: Miembro
}

/**
 * Server-side: garantiza sesión con tenantId y SIN miembroId (admin del tenant).
 * Si falta sesión → /api/auth/login. Si es cliente PWA → / (no autorizado).
 */
export async function requireAdmin(): Promise<AdminContext> {
  const session = await getSession()
  if (!session?.user) {
    redirect('/api/auth/login?returnTo=/admin/dashboard')
  }
  const tenantId = getTenantId(session.user)
  if (!tenantId) {
    redirect('/?error=missing-tenant')
  }
  if (getMiembroId(session.user)) {
    redirect('/?error=not-admin')
  }
  return {
    tenantId,
    user: {
      name: session.user.name as string | undefined,
      email: session.user.email as string | undefined,
      picture: session.user.picture as string | undefined,
    },
  }
}

/**
 * Server-side: garantiza sesión de cliente vinculado al tenant del subdominio.
 * Si no hay slug en el host (acceso a root) → /. Si no hay sesión → login.
 * Si la sesión es de un admin (tenantId claim, sin miembroId) → /. Si la sesión
 * existe pero no hay miembro vinculado a este tenant → / con mensaje.
 *
 * Lo usan las páginas PWA: /recompensas, /puntos (y cualquier otra que viva
 * bajo {slug}.{host}).
 */
export async function requireCliente(): Promise<ClienteContext> {
  const h = headers()
  const slug = h.get('x-tenant-slug') || ''
  const pathname = h.get('x-pathname') || '/'

  // Sin slug = estamos en el apex (el callback de Auth0 siempre aterriza
  // ahí porque AUTH0_BASE_URL es el apex). Si el usuario logueado es un
  // cliente vinculado a un tenant, redirigirlo cross-host al subdominio
  // preservando el path original (/puntos, /recompensas, /feed, ...).
  if (!slug) {
    const session = await getSession()
    if (!session?.user) {
      redirect(`/api/auth/login?returnTo=${encodeURIComponent(pathname)}`)
    }

    if (getTenantId(session.user) && !getMiembroId(session.user)) {
      redirect('/')
    }

    const sub = session.user.sub as string | undefined
    if (sub) {
      const linked = await findMiembroByAuth0(sub)
      if (linked) {
        redirect(`${tenantBaseUrl(linked.tenant.slug)}${pathname}`)
      }
    }
    redirect('/')
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) redirect(tenantBaseUrl(slug))

  const session = await getSession()
  if (!session?.user) {
    // returnTo es relativo al apex (AUTH0_BASE_URL); cuando el callback
    // aterriza en apex+pathname, la rama "sin slug" arriba se encarga de
    // redirigir cross-host al subdominio correcto.
    redirect(`/api/auth/login?returnTo=${encodeURIComponent(pathname)}`)
  }

  // Admin de algún tenant abriendo PWA cliente: no autorizado.
  if (getTenantId(session.user) && !getMiembroId(session.user)) {
    redirect('/')
  }

  const auth0UserId = session.user.sub as string
  const miembro = await getMiembroByAuth0(tenant.id, auth0UserId)
  if (!miembro) redirect('/')

  return { tenant, miembro }
}
