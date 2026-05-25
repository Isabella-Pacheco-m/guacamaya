import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import { getTenantFromRequest, TenantNotFoundError } from '@/lib/tenant'
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

export async function requireAdminTenantId(req?: NextRequest): Promise<AdminAuthResult> {
  const session = await readSession(req)
  if (!session?.user) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }
  const tenantId = getTenantId(session.user)
  if (!tenantId) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Token sin tenantId' }, { status: 403 }),
    }
  }
  // MVP: si el JWT trae miembroId el usuario es cliente PWA, no admin del tenant.
  if (getMiembroId(session.user)) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Operación reservada al admin del tenant' },
        { status: 403 }
      ),
    }
  }
  return { ok: true, tenantId }
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
