import { NextResponse, type NextRequest } from 'next/server'
import { isSuperadmin } from '@/lib/superadmin-auth'
import {
  TenantCreateError,
  createTenant,
  type CreateTenantInput,
} from '@/lib/tenant'
import { createAdminInvitation } from '@/lib/admin-invitations'
import { adminClaimUrl } from '@/lib/config'
import { getSession } from '@auth0/nextjs-auth0'

export const dynamic = 'force-dynamic'

interface CreateBody {
  nombre?: string
  slug?: string
  color_primario?: string
  puntos_por_mil?: number
  puntos_cumpleanos?: number | null
  email_dueno?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  if (!(await isSuperadmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }
  const session = await getSession()
  const createdByEmail = (session?.user.email as string | undefined) ?? null

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const emailDueno = body.email_dueno?.trim().toLowerCase() ?? ''
  if (!emailDueno || !EMAIL_RE.test(emailDueno)) {
    return NextResponse.json(
      { error: 'email_dueno requerido y debe ser un email válido' },
      { status: 400 }
    )
  }

  const input: CreateTenantInput = {
    nombre: body.nombre ?? '',
    slug: body.slug ?? '',
    color_primario: body.color_primario,
    puntos_por_mil: body.puntos_por_mil,
    puntos_cumpleanos: body.puntos_cumpleanos ?? null,
  }

  try {
    const tenant = await createTenant(input)
    const { invitation, token } = await createAdminInvitation({
      tenantId: tenant.id,
      email: emailDueno,
      ttlDays: 7,
      createdByEmail,
    })

    return NextResponse.json({
      tenant,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at,
        claim_url: adminClaimUrl(token),
      },
    })
  } catch (err) {
    if (err instanceof TenantCreateError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('superadmin/tenants POST', err)
    return NextResponse.json(
      { error: 'Error inesperado al crear el tenant' },
      { status: 500 }
    )
  }
}
