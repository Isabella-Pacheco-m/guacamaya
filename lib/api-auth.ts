import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import {
  getTenantFromRequest,
  isAdminOfTenant,
  TenantNotFoundError,
} from '@/lib/tenant'
import { getMiembroByAuth0 } from '@/lib/invitaciones'
import type { Miembro, Tenant } from '@/types'

// Lectura de sesión robusta en App Router. Con @auth0/nextjs-auth0 v3.8,
// `getSession()` (sin args, vía next/headers `cookies()`) resuelve la sesión
// tanto en Server Components como en Route Handlers — es el camino que ya
// funciona en las páginas de este app. Lo intentamos primero y, si no
// resuelve usuario (o lanza en algún runtime), caemos al par (req,res) que
// lee de `req.cookies`. Así ninguno de los dos caminos es un punto único de
// fallo y evitamos el 401 "No autenticado" espurio en mutaciones del cliente.
async function readSession(req?: NextRequest) {
  try {
    const s = await getSession()
    if (s?.user) return s
  } catch {
    // getSession() sin args puede lanzar fuera de contexto de request; seguimos.
  }
  if (req) {
    try {
      return await getSession(req, new NextResponse())
    } catch {
      return null
    }
  }
  return null
}

export type AdminAuthResult =
  | { ok: true; tenantId: string }
  | { ok: false; res: NextResponse }

export type ClienteAuthResult =
  | { ok: true; tenant: Tenant; miembro: Miembro }
  | { ok: false; res: NextResponse }

// Admin del tenant: tenant resuelto desde el subdominio (header x-tenant-slug)
// e identidad por email asignado (tenants.admin_email), igual que el cliente
// se vincula por auth0_user_id. Sin claim de Auth0: el admin es quien inicia
// sesión en {slug}.guacamaya.net con el correo que el superadmin le asignó.
export async function requireAdminTenantId(req?: NextRequest): Promise<AdminAuthResult> {
  const session = await readSession(req)
  if (!session?.user) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }

  let tenant: Tenant
  try {
    tenant = await getTenantFromRequest()
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return {
        ok: false,
        res: NextResponse.json({ error: err.message }, { status: 404 }),
      }
    }
    throw err
  }

  const email = String(session.user.email ?? '').toLowerCase()
  const verified = Boolean(session.user.email_verified)
  if (!email || !verified || !(await isAdminOfTenant(tenant.id, email))) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Operación reservada al admin del tenant' },
        { status: 403 }
      ),
    }
  }
  return { ok: true, tenantId: tenant.id }
}

// Cliente PWA: tenant resuelto desde subdominio (header x-tenant-slug) y
// miembro vinculado por auth0_user_id. Si la sesión es admin (tenantId sin
// miembroId), se rechaza — cada flujo cliente vive bajo {slug}.{host}.
export async function requireClienteContext(req?: NextRequest): Promise<ClienteAuthResult> {
  let tenant: Tenant
  try {
    tenant = await getTenantFromRequest()
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return {
        ok: false,
        res: NextResponse.json({ error: err.message }, { status: 404 }),
      }
    }
    throw err
  }

  const session = await readSession(req)
  if (!session?.user) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }

  if (getTenantId(session.user) && !getMiembroId(session.user)) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Operación reservada al cliente del tenant' },
        { status: 403 }
      ),
    }
  }

  const auth0UserId = session.user.sub as string | undefined
  if (!auth0UserId) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Token sin sub' }, { status: 401 }),
    }
  }

  const miembro = await getMiembroByAuth0(tenant.id, auth0UserId)
  if (!miembro) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'No tienes perfil en este negocio' },
        { status: 403 }
      ),
    }
  }

  return { ok: true, tenant, miembro }
}
