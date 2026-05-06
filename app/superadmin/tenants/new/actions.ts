'use server'

import { getSession } from '@auth0/nextjs-auth0'
import { requireSuperadmin } from '@/lib/superadmin-auth'
import {
  TenantCreateError,
  createTenant,
  type CreateTenantInput,
} from '@/lib/tenant'
import { createAdminInvitation } from '@/lib/admin-invitations'
import { adminClaimUrl } from '@/lib/config'

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
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Server Action: corre en el mismo contexto del Server Component (lee la
// sesión vía cookies() de next/headers). No depende de que el navegador
// mande la cookie en un fetch — eso evita problemas con SW, SameSite,
// extensiones, etc. Si la auth pasa el layout, también pasa aquí.
export async function createTenantAction(
  input: CreateTenantActionInput
): Promise<CreateTenantActionResult> {
  // Reutiliza requireSuperadmin (server-component path: getSession() sin args).
  // Si no es superadmin, redirige; si lo es, devuelve user.
  await requireSuperadmin()
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
    }
  } catch (err) {
    if (err instanceof TenantCreateError) {
      return { ok: false, error: err.message }
    }
    console.error('createTenantAction', err)
    return { ok: false, error: 'Error inesperado al crear el tenant' }
  }
}
