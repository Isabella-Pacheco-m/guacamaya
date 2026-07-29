// Integración Wompi (Colombia). Solo servidor: aquí viven los secretos.
// https://docs.wompi.co/docs/colombia/widget-checkout-web/
import 'server-only'

import crypto from 'node:crypto'

export const SUSCRIPCION_PRECIO_COP = 35_000
export const SUSCRIPCION_MONEDA = 'COP'
export const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/'

// Eventos más viejos que esto se rechazan (anti-replay).
const MAX_EDAD_EVENTO_SEG = 72 * 3600

export function copACentavos(cop: number): number {
  return cop * 100
}

export function getWompiPublicKey(): string {
  const key = process.env.WOMPI_PUBLIC_KEY
  if (!key) throw new Error('WOMPI_PUBLIC_KEY no configurada')
  return key
}

function wompiApiBase(): string {
  return getWompiPublicKey().startsWith('pub_test_')
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1'
}

// Firma de integridad: sha256(referencia + centavos + moneda + secreto).
// Siempre en servidor — exponer el secreto permitiría firmar montos arbitrarios.
export function firmarIntegridad(
  referencia: string,
  montoEnCentavos: number,
  moneda: string = SUSCRIPCION_MONEDA
): string {
  const secreto = process.env.WOMPI_SECRET_INTEGRITY
  if (!secreto) throw new Error('WOMPI_SECRET_INTEGRITY no configurada')
  return crypto
    .createHash('sha256')
    .update(`${referencia}${montoEnCentavos}${moneda}${secreto}`)
    .digest('hex')
}

export function urlCheckout(params: {
  referencia: string
  montoEnCentavos: number
  redirectUrl: string
  email?: string
  nombre?: string
}): string {
  const q = new URLSearchParams({
    'public-key': getWompiPublicKey(),
    currency: SUSCRIPCION_MONEDA,
    'amount-in-cents': String(params.montoEnCentavos),
    reference: params.referencia,
    'signature:integrity': firmarIntegridad(
      params.referencia,
      params.montoEnCentavos
    ),
    'redirect-url': params.redirectUrl,
  })
  if (params.email) q.set('customer-data:email', params.email)
  if (params.nombre) q.set('customer-data:full-name', params.nombre)
  return `${WOMPI_CHECKOUT_URL}?${q.toString()}`
}

// ── Eventos (webhooks) ──

export interface WompiEvento {
  event: string
  data: Record<string, unknown>
  sent_at?: string
  timestamp: number
  signature: {
    properties: string[]
    checksum: string
  }
}

export function esEventoWompi(body: unknown): body is WompiEvento {
  if (typeof body !== 'object' || body === null) return false
  const e = body as Record<string, unknown>
  const sig = e.signature as Record<string, unknown> | undefined
  return (
    typeof e.event === 'string' &&
    typeof e.data === 'object' &&
    e.data !== null &&
    typeof e.timestamp === 'number' &&
    typeof sig === 'object' &&
    sig !== null &&
    Array.isArray(sig.properties) &&
    typeof sig.checksum === 'string'
  )
}

function valorEn(data: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        typeof acc === 'object' && acc !== null
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      data
    )
}

// Autenticidad: sha256(valores de signature.properties + timestamp + secreto)
// == signature.checksum. Las properties se leen del evento (Wompi puede
// variarlas). Comparación en tiempo constante + ventana anti-replay.
export function verificarEvento(evento: WompiEvento): boolean {
  const secreto = process.env.WOMPI_SECRET_EVENT
  if (!secreto) return false

  const edad = Math.abs(Date.now() / 1000 - evento.timestamp)
  if (!Number.isFinite(edad) || edad > MAX_EDAD_EVENTO_SEG) return false

  let concatenado = ''
  for (const prop of evento.signature.properties) {
    const v = valorEn(evento.data, prop)
    if (v === undefined || v === null) return false
    concatenado += String(v)
  }
  concatenado += `${evento.timestamp}${secreto}`

  const esperado = crypto.createHash('sha256').update(concatenado).digest('hex')
  const recibido = evento.signature.checksum.toLowerCase()

  if (recibido.length !== esperado.length) return false
  return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recibido))
}

// ── Consulta de transacción (solo para pintar estado post-redirect;
//    la fuente de verdad que activa es el webhook) ──

export interface WompiTransaccion {
  id: string
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING'
  reference: string
  amount_in_cents: number
  currency: string
}

export async function consultarTransaccion(
  id: string
): Promise<WompiTransaccion | null> {
  const privateKey = process.env.WOMPI_PRIVATE_KEY
  if (!privateKey) throw new Error('WOMPI_PRIVATE_KEY no configurada')
  if (!/^[\w-]{1,64}$/.test(id)) return null

  const res = await fetch(`${wompiApiBase()}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${privateKey}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as { data?: WompiTransaccion }
  return json.data ?? null
}
