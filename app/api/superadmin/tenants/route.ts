import { NextResponse, type NextRequest } from 'next/server'
import { isSuperadmin } from '@/lib/superadmin-auth'
import {
  TenantCreateError,
  createTenant,
  type CreateTenantInput,
} from '@/lib/tenant'
import { tenantBaseUrl } from '@/lib/config'

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
  if (!(await isSuperadmin(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

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
    admin_email: emailDueno,
    color_primario: body.color_primario,
    puntos_por_mil: body.puntos_por_mil,
    puntos_cumpleanos: body.puntos_cumpleanos ?? null,
  }

  try {
    const tenant = await createTenant(input)

    // El admin entra solo: inicia sesión en su subdominio con admin_email.
    return NextResponse.json({
      tenant,
      admin_email: emailDueno,
      admin_login_url: tenantBaseUrl(tenant.slug),
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
