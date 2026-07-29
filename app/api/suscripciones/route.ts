import { NextResponse, type NextRequest } from 'next/server'
import {
  crearSuscripcion,
  SuscripcionError,
} from '@/lib/suscripciones'
import { copACentavos, urlCheckout } from '@/lib/wompi'
import { AUTH_BASE_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Alta pública de suscripción: crea el intento PENDIENTE y devuelve la URL
// del checkout firmada en servidor (monto/referencia no manipulables).
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const raw = body as Record<string, unknown>

  for (const k of ['nombre', 'negocio', 'email'] as const) {
    if (typeof raw[k] !== 'string') {
      return NextResponse.json({ error: `${k} requerido` }, { status: 400 })
    }
  }
  if (raw.telefono !== undefined && raw.telefono !== null && typeof raw.telefono !== 'string') {
    return NextResponse.json({ error: 'telefono debe ser string' }, { status: 400 })
  }

  try {
    const susc = await crearSuscripcion({
      nombre: raw.nombre as string,
      negocio: raw.negocio as string,
      email: raw.email as string,
      telefono: (raw.telefono as string | null | undefined) ?? null,
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
