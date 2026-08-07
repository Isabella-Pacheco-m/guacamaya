import { NextResponse, type NextRequest } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  assertPushListo,
  deletePushSuscripcion,
  enviarPushDePrueba,
  existePushSuscripcion,
  type ResultadoPrueba,
  getVapidPublicKey,
  olvidarEndpoint,
  PushConfigError,
  PushSaveError,
  savePushSuscripcion,
} from '@/lib/push'
import type { Tenant } from '@/types'

export const dynamic = 'force-dynamic'

// Suscripción push del dispositivo del cliente. GET entrega la clave pública
// VAPID (necesaria para pushManager.subscribe), POST guarda la suscripción y
// DELETE la retira. Todo gateado por el flag del tenant.
//
// El POST también lo llama el service worker cuando el navegador rota la
// suscripción por su cuenta (evento pushsubscriptionchange), mandando
// `anterior` con el endpoint muerto para darlo de baja en el mismo paso.

type GateResult =
  | { ok: false; res: NextResponse }
  | { ok: true; tenant: Tenant; miembroId: string }

async function gate(req: NextRequest): Promise<GateResult> {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return { ok: false, res: auth.res }
  const features = await getTenantFeatures(auth.tenant.id)
  if (!features.push_enabled) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Funcionalidad no habilitada' },
        { status: 403 }
      ),
    }
  }
  // Config inconsistente = no se suscribe a nadie. Suscribir contra una clave
  // que no corresponde crea dispositivos que nunca recibirán nada y que el
  // negocio contaría como alcance real.
  try {
    assertPushListo()
  } catch (err) {
    if (err instanceof PushConfigError) {
      return {
        ok: false,
        res: NextResponse.json(
          { error: err.message, detalle: err.detalle },
          { status: 503 }
        ),
      }
    }
    throw err
  }
  return { ok: true, tenant: auth.tenant, miembroId: auth.miembro.id }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if (!g.ok) return g.res
  return NextResponse.json({ vapidPublicKey: getVapidPublicKey() })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if (!g.ok) return g.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { endpoint, keys, clave, anterior, bienvenida } = (body ?? {}) as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown }
    clave?: unknown
    anterior?: unknown
    bienvenida?: unknown
  }

  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > 1000
  ) {
    return NextResponse.json({ error: 'endpoint inválido' }, { status: 400 })
  }
  const p256dh = keys?.p256dh
  const authKey = keys?.auth
  if (
    typeof p256dh !== 'string' ||
    typeof authKey !== 'string' ||
    !p256dh ||
    !authKey ||
    p256dh.length > 200 ||
    authKey.length > 100
  ) {
    return NextResponse.json({ error: 'keys inválidas' }, { status: 400 })
  }
  const claveVapid =
    typeof clave === 'string' && clave.length > 0 && clave.length <= 200
      ? clave
      : null

  try {
    await savePushSuscripcion(g.tenant.id, g.miembroId, {
      endpoint,
      p256dh,
      auth: authKey,
      clave: claveVapid,
    })

    // Rotación: el endpoint viejo ya no recibe nada y solo inflaría el conteo
    // de suscriptores del negocio.
    if (
      typeof anterior === 'string' &&
      anterior.startsWith('https://') &&
      anterior !== endpoint
    ) {
      await olvidarEndpoint(g.tenant.id, anterior)
    }

    // Releer: si la escritura "pasó" pero la fila no está (permisos, RLS,
    // tabla ausente), el cliente se enteraría igual que el negocio — cuando
    // el panel marca cero. Mejor decirlo aquí.
    const guardada = await existePushSuscripcion(g.tenant.id, endpoint)
    if (!guardada) {
      console.error('POST /api/me/push: la suscripción no persistió', {
        tenantId: g.tenant.id,
      })
      return NextResponse.json(
        {
          error: 'La suscripción no quedó guardada en el servidor',
          detalle: 'no-persistio',
        },
        { status: 500 }
      )
    }

    // Solo cuando el miembro acaba de activarlas (no en las resincronizaciones
    // de cada apertura). Si el push de bienvenida falla, la suscripción sigue
    // siendo válida: se reporta pero no se tumba la respuesta.
    let prueba: ResultadoPrueba | undefined
    if (bienvenida === true) {
      prueba = await enviarPushDePrueba(g.tenant, {
        endpoint,
        p256dh,
        auth: authKey,
        clave: claveVapid,
      })
    }

    return NextResponse.json({ ok: true, prueba })
  } catch (err) {
    console.error('POST /api/me/push', err)
    if (err instanceof PushSaveError) {
      return NextResponse.json(
        { error: 'No pudimos guardar tu suscripción', detalle: err.code },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { endpoint } = (body ?? {}) as { endpoint?: unknown }
  if (typeof endpoint !== 'string' || !endpoint) {
    return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 })
  }

  try {
    await deletePushSuscripcion(auth.tenant.id, auth.miembro.id, endpoint)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/me/push', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
