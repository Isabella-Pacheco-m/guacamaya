'use server'

import { getSession } from '@auth0/nextjs-auth0'
import { isSuperadmin } from '@/lib/superadmin-auth'
import {
  TenantCreateError,
  createTenant,
  type CreateTenantInput,
} from '@/lib/tenant'
import { createAdminInvitation } from '@/lib/admin-invitations'
import { adminClaimUrl } from '@/lib/config'
import { registerTenantDomainOnVercel } from '@/lib/vercel'

export interface CreateTenantActionInput {
  nombre: string
  slug: string
  color_primario: string
  puntos_por_mil: number
  email_dueno: string
}

export interface CreateTenantActionResult {
  ok: boolean
  error?: string
  tenant?: {
    id: string
    nombre: string
    slug: string
    color_primario: string
  }
  invitation?: {
    id: string
    email: string | null
    expires_at: string
    claim_url: string
  }
  // Cuando el subdominio no se pudo registrar automáticamente en Vercel,
  // la creación del tenant igual procede — devolvemos un warning para que
  // la UI muestre instrucciones de registro manual al superadmin.
  domain_warning?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Server Action: corre en el mismo contexto del Server Component (lee la
// sesión vía cookies() de next/headers). No depende de que el navegador
// mande la cookie en un fetch — eso evita problemas con SW, SameSite,
// extensiones, etc.
//
// IMPORTANT: NO uses requireSuperadmin() aquí — hace redirect() que en una
// Server Action interrumpe el return y el cliente recibe undefined. En su
// lugar usamos isSuperadmin() y devolvemos un error explícito que la UI
// puede mostrar (con un link a /api/auth/login si la sesión expiró).
export async function createTenantAction(
  input: CreateTenantActionInput
): Promise<CreateTenantActionResult> {
  if (!(await isSuperadmin())) {
    return {
      ok: false,
      error:
        'Tu sesión no es válida o expiró. Vuelve a iniciar sesión y reintenta.',
    }
  }
  const session = await getSession()
  const createdByEmail = (session?.user.email as string | undefined) ?? null

  const emailDueno = input.email_dueno?.trim().toLowerCase() ?? ''
  if (!emailDueno || !EMAIL_RE.test(emailDueno)) {
    return { ok: false, error: 'email_dueno requerido y debe ser válido' }
  }

  const tenantInput: CreateTenantInput = {
    nombre: input.nombre ?? '',
    slug: input.slug ?? '',
    color_primario: input.color_primario,
    puntos_por_mil: input.puntos_por_mil,
    puntos_cumpleanos: null,
  }

  try {
    const tenant = await createTenant(tenantInput)
    const { invitation, token } = await createAdminInvitation({
      tenantId: tenant.id,
      email: emailDueno,
      ttlDays: 7,
      createdByEmail,
    })

    // Registrar el subdominio en Vercel para que {slug}.guacamaya.net emita
    // cert SSL y empiece a servir el app. No bloqueamos la creación si esto
    // falla — el superadmin puede agregarlo manualmente desde el dashboard.
    let domainWarning: string | undefined
    const domainRes = await registerTenantDomainOnVercel(tenant.slug)
    if (!domainRes.ok) {
      if (domainRes.reason === 'missing-config') {
        domainWarning =
          'El tenant fue creado, pero VERCEL_API_TOKEN/VERCEL_PROJECT_ID no están configurados. Agrega ' +
          `${tenant.slug}.guacamaya.net manualmente en Vercel → Project → Settings → Domains.`
      } else {
        domainWarning =
          `El tenant fue creado, pero falló el registro del subdominio en Vercel (${domainRes.detail}). ` +
          `Agrega ${tenant.slug}.guacamaya.net manualmente en Vercel → Project → Settings → Domains.`
      }
    }

    return {
      ok: true,
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        slug: tenant.slug,
        color_primario: tenant.color_primario,
      },
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at,
        claim_url: adminClaimUrl(token),
      },
      domain_warning: domainWarning,
    }
  } catch (err) {
    if (err instanceof TenantCreateError) {
      return { ok: false, error: err.message }
    }
    console.error('createTenantAction', err)
    return { ok: false, error: 'Error inesperado al crear el tenant' }
  }
}
