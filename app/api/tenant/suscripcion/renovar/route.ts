import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId, readSession } from '@/lib/api-auth'
import {
  crearSuscripcion,
  getUltimaSuscripcion,
  SuscripcionError,
} from '@/lib/suscripciones'
import { copACentavos, urlCheckout } from '@/lib/wompi'
import { AUTH_BASE_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Renovación mensual desde el panel: crea un intento de pago nuevo (referencia
// nueva, las referencias de Wompi no se reusan) con los datos de la última
// suscripción del email y devuelve la URL del checkout. El periodo se extiende
// al confirmarse el pago vía webhook.
export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const session = await readSession(req)
  const email = String(session?.user?.email ?? '').toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Sesión sin email' }, { status: 401 })
  }

  const previa = await getUltimaSuscripcion(email)

  try {
    const susc = await crearSuscripcion({
      nombre: previa?.nombre ?? String(session?.user?.name ?? email),
      negocio: previa?.negocio ?? 'Renovación',
      email,
      telefono: previa?.telefono ?? null,
    })

    const checkoutUrl = urlCheckout({
      referencia: susc.referencia,
      montoEnCentavos: copACentavos(susc.monto_cop),
      redirectUrl: `${AUTH_BASE_URL}/suscribirse/gracias`,
      email: susc.email,
      nombre: susc.nombre,
    })

    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    if (err instanceof SuscripcionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
