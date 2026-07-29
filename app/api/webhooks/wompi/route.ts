import { NextResponse, type NextRequest } from 'next/server'
import {
  esEventoWompi,
  verificarEvento,
  copACentavos,
  SUSCRIPCION_MONEDA,
} from '@/lib/wompi'
import {
  activarSuscripcion,
  marcarRechazada,
  getSuscripcionPorReferencia,
  SuscripcionError,
} from '@/lib/suscripciones'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Webhook de Wompi (transaction.updated): la única fuente de verdad que
// activa suscripciones. Autenticidad por checksum con WOMPI_SECRET_EVENT.
// Configurar en Wompi: URL de eventos → https://guacamaya.net/api/webhooks/wompi
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!esEventoWompi(body)) {
    return NextResponse.json({ error: 'Evento malformado' }, { status: 400 })
  }
  if (!verificarEvento(body)) {
    return NextResponse.json({ error: 'Checksum inválido' }, { status: 401 })
  }

  // Otros eventos se reconocen con 200 para que Wompi no reintente.
  if (body.event !== 'transaction.updated') {
    return NextResponse.json({ ok: true, ignored: body.event })
  }

  const tx = (body.data as { transaction?: Record<string, unknown> }).transaction
  if (!tx || typeof tx.reference !== 'string' || typeof tx.id !== 'string') {
    return NextResponse.json({ error: 'Transacción malformada' }, { status: 400 })
  }

  const referencia = tx.reference
  const susc = await getSuscripcionPorReferencia(referencia)
  if (!susc) {
    // Referencia ajena (otro producto del mismo comercio): reconocer sin actuar.
    return NextResponse.json({ ok: true, ignored: 'referencia desconocida' })
  }

  const status = String(tx.status ?? '')

  try {
    if (status === 'APPROVED') {
      // Lo aprobado debe ser exactamente lo que esta fila cobra.
      if (
        tx.amount_in_cents !== copACentavos(susc.monto_cop) ||
        tx.currency !== SUSCRIPCION_MONEDA
      ) {
        console.error('webhook wompi: monto/moneda no coinciden', {
          referencia,
          amount_in_cents: tx.amount_in_cents,
          currency: tx.currency,
        })
        return NextResponse.json({ error: 'Monto no coincide' }, { status: 422 })
      }
      await activarSuscripcion(referencia, tx.id)
    } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(status)) {
      await marcarRechazada(referencia, tx.id)
    }
    // PENDING u otros estados intermedios: no cambiar nada todavía.
  } catch (err) {
    if (err instanceof SuscripcionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('webhook wompi', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
