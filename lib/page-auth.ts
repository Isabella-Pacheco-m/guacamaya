import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import {
  getTenantBySlug,
  findTenantByAdminEmail,
  isAdminOfTenant,
} from '@/lib/tenant'
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
 * Server-side: garantiza que la sesión es del admin del tenant del subdominio.
 *
 * Modelo por email (no por claim de Auth0): el admin es quien inicia sesión en
 * {slug}.guacamaya.net con el correo que el superadmin asignó al tenant
 * (tenants.admin_email), siempre que el email esté verificado por el IdP.
 *
 *  - sin sesión → /api/auth/login (preservando el destino)
 *  - en el apex (sin slug): buscar el tenant por admin_email y mandar al
 *    subdominio; si no es admin de ninguno → / con error
 *  - en el subdominio: el email del token debe coincidir con admin_email
 */
export async function requireAdmin(): Promise<AdminContext> {
  const h = headers()
  const slug = h.get('x-tenant-slug') || ''
  const pathname = h.get('x-pathname') || '/admin/dashboard'

  const session = await getSession()
  if (!session?.user) {
    // Preservar el destino original — si se entra a /admin/miembros sin
    // sesión y volvemos a /admin/dashboard hardcodeado, el usuario pierde
    // el contexto y aparenta un "redirige siempre a dashboard".
    redirect(`/api/auth/login?returnTo=${encodeURIComponent(pathname)}`)
  }

  const email = String(session.user.email ?? '').toLowerCase()
  const verified = Boolean(session.user.email_verified)

  // En el apex (callback de Auth0 siempre aterriza ahí): no hay tenant en el
  // host. Resolver el subdominio del admin por email y redirigir, preservando
  // el path (/admin/miembros, etc.).
  if (!slug) {
    if (email && verified) {
      const t = await findTenantByAdminEmail(email)
      if (t) {
        const search = h.get('x-search') || ''
        const dest = pathname.startsWith('/admin')
          ? `${pathname}${search}`
          : '/admin/dashboard'
        redirect(`${tenantBaseUrl(t.slug)}${dest}`)
      }
    }
    redirect('/?error=not-admin')
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) redirect('/?error=missing-tenant')

  if (!email || !verified || !(await isAdminOfTenant(tenant.id, email))) {
    redirect('/?error=not-admin')
  }

  return {
    tenantId: tenant.id,
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
