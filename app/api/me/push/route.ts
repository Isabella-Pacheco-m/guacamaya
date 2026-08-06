import { NextResponse, type NextRequest } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  deletePushSuscripcion,
  existePushSuscripcion,
  getVapidPublicKey,
  pushConfigurado,
  PushSaveError,
  savePushSuscripcion,
} from '@/lib/push'

export const dynamic = 'force-dynamic'

// Suscripción push del dispositivo del cliente. GET entrega la clave pública
// VAPID (necesaria para pushManager.subscribe), POST guarda la suscripción y
// DELETE la retira. Todo gateado por el flag del tenant.

type GateResult =
  | { ok: false; res: NextResponse }
  | { ok: true; tenantId: string; miembroId: string }

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
  if (!pushConfigurado()) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Notificaciones no configuradas en la plataforma' },
        { status: 503 }
      ),
    }
  }
  return { ok: true, tenantId: auth.tenant.id, miembroId: auth.miembro.id }
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
  const { endpoint, keys } = (body ?? {}) as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown }
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

  try {
    await savePushSuscripcion(g.tenantId, g.miembroId, {
      endpoint,
      p256dh,
      auth: authKey,
    })
    // Releer: si la escritura "pasó" pero la fila no está (permisos, RLS,
    // tabla ausente), el cliente se enteraría igual que el negocio — cuando
    // el panel marca cero. Mejor decirlo aquí.
    const guardada = await existePushSuscripcion(g.tenantId, endpoint)
    if (!guardada) {
      console.error('POST /api/me/push: la suscripción no persistió', {
        tenantId: g.tenantId,
      })
      return NextResponse.json(
        {
          error: 'La suscripción no quedó guardada en el servidor',
          detalle: 'no-persistio',
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
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
