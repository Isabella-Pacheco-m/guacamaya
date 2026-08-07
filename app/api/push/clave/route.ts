import { NextResponse } from 'next/server'
import { getVapidPublicKey, vapidParejaValida } from '@/lib/push'

export const dynamic = 'force-dynamic'

/**
 * Clave pública VAPID de la plataforma.
 *
 * Sin sesión a propósito: la usa el service worker cuando el navegador rota
 * la suscripción (evento `pushsubscriptionchange`), que puede dispararse sin
 * ninguna pestaña abierta y sin cookie válida. La clave es pública por
 * diseño — es literalmente lo que el navegador expone en cada suscripción.
 */
export async function GET() {
  const vapidPublicKey = getVapidPublicKey()
  if (!vapidPublicKey || vapidParejaValida() === false) {
    return NextResponse.json(
      { error: 'Notificaciones no configuradas' },
      { status: 503 }
    )
  }
  return NextResponse.json({ vapidPublicKey })
}
