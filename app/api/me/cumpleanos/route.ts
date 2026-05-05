import { NextResponse, type NextRequest} from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { setMesCumpleanos, MesCumpleanosError } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  // El cliente solo puede setear su mes si el negocio activó la feature.
  const features = await getTenantFeatures(auth.tenant.id)
  if (!features.cumpleanos_enabled) {
    return NextResponse.json(
      { error: 'Funcionalidad no habilitada' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const raw = (body as Record<string, unknown>).mes_cumpleanos
  let mes: number | null
  if (raw === null) {
    mes = null
  } else if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 12) {
    mes = raw
  } else {
    return NextResponse.json(
      { error: 'mes_cumpleanos debe ser entero entre 1 y 12, o null' },
      { status: 400 }
    )
  }

  try {
    const miembro = await setMesCumpleanos(auth.tenant.id, auth.miembro.id, mes)
    return NextResponse.json({ miembro })
  } catch (err) {
    if (err instanceof MesCumpleanosError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('PATCH /api/me/cumpleanos', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
