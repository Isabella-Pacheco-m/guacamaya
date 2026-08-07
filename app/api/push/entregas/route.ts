import { NextResponse, type NextRequest } from 'next/server'
import { registrarEntrega } from '@/lib/push'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Confirmación de entrega: el dispositivo avisa que SÍ recibió el push.
 *
 * Es la única prueba real de que una notificación llegó. El push service
 * responde 201 cuando acepta el mensaje, no cuando el celular lo muestra, así
 * que sin esto "enviada a 40 dispositivos" es una suposición.
 *
 * Sin sesión a propósito: el service worker se despierta para recibir el push
 * aunque no haya ninguna pestaña abierta ni cookie vigente, y una entrega no
 * confirmada por no poder autenticarse sería justo el dato que hace falta. La
 * escritura es inofensiva —marca como entregado un envío ya existente— y solo
 * la puede provocar quien conozca el endpoint del dispositivo, que es un
 * secreto de alta entropía que emite el propio navegador.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { endpoint, envioId } = (body ?? {}) as {
    endpoint?: unknown
    envioId?: unknown
  }

  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > 1000
  ) {
    return NextResponse.json({ error: 'endpoint inválido' }, { status: 400 })
  }
  const id =
    typeof envioId === 'string' && UUID_RE.test(envioId) ? envioId : null

  try {
    await registrarEntrega(endpoint, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/push/entregas', err)
    // Nunca se le devuelve un error al worker: la notificación ya se mostró y
    // reintentar no aportaría nada.
    return NextResponse.json({ ok: false })
  }
}
