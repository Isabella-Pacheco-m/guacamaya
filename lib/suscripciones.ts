// Capa de datos de la suscripción mensual (migración 0036). Solo servidor.
// Vínculo con el tenant por email: suscripciones.email == tenants.admin_email.
import 'server-only'

import crypto from 'node:crypto'
import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SUSCRIPCION_PRECIO_COP } from '@/lib/wompi'
import type { Suscripcion } from '@/types'

export class SuscripcionError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'SuscripcionError'
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CrearSuscripcionInput {
  nombre: string
  negocio: string
  email: string
  telefono?: string | null
}

// Crea el intento de pago (PENDIENTE) con referencia única para Wompi.
export async function crearSuscripcion(
  input: CrearSuscripcionInput
): Promise<Suscripcion> {
  const nombre = input.nombre.trim()
  const negocio = input.negocio.trim()
  const email = input.email.trim().toLowerCase()
  const telefono = input.telefono?.trim() || null

  if (!nombre || nombre.length > 80) {
    throw new SuscripcionError('nombre requerido (máximo 80 caracteres)', 400)
  }
  if (!negocio || negocio.length > 80) {
    throw new SuscripcionError('negocio requerido (máximo 80 caracteres)', 400)
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    throw new SuscripcionError('email inválido', 400)
  }
  if (telefono && !/^\+?\d{7,15}$/.test(telefono.replace(/[\s-]/g, ''))) {
    throw new SuscripcionError('teléfono inválido', 400)
  }

  const referencia = `guac-${crypto.randomBytes(12).toString('base64url')}`

  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .insert({
      nombre,
      negocio,
      email,
      telefono,
      referencia,
      monto_cop: SUSCRIPCION_PRECIO_COP,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Suscripcion
}

export async function getSuscripcionPorReferencia(
  referencia: string
): Promise<Suscripcion | null> {
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .select('*')
    .eq('referencia', referencia)
    .maybeSingle()
  if (error) throw error
  return (data as Suscripcion | null) ?? null
}

export const getUltimaSuscripcion = cache(
  async (email: string): Promise<Suscripcion | null> => {
    const e = email.trim().toLowerCase()
    if (!e) return null
    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .select('*')
      .eq('email', e)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as Suscripcion | null) ?? null
  }
)

export async function getSuscripcionActiva(
  email: string
): Promise<Suscripcion | null> {
  const e = email.trim().toLowerCase()
  if (!e) return null
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .select('*')
    .eq('email', e)
    .eq('estado', 'ACTIVA')
    .order('pagada_hasta', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Suscripcion | null) ?? null
}

// Bloqueo por desuscripción: la fila más reciente quedó CANCELADA.
// Negocios sin filas (anteriores al cobro) no se bloquean.
export const esAccesoCancelado = cache(
  async (email: string): Promise<boolean> => {
    const ultima = await getUltimaSuscripcion(email)
    return ultima?.estado === 'CANCELADA'
  }
)

// Activación desde el webhook (pago APPROVED). Solo transiciona
// PENDIENTE → ACTIVA: un evento repetido (retry/replay) no reactiva filas
// canceladas ni extiende dos veces. pagada_hasta = max(hoy, periodo
// vigente) + 1 mes.
export async function activarSuscripcion(
  referencia: string,
  wompiTransactionId: string
): Promise<void> {
  const fila = await getSuscripcionPorReferencia(referencia)
  if (!fila) throw new SuscripcionError(`referencia '${referencia}' no existe`, 404)
  if (fila.estado !== 'PENDIENTE') return

  const activa = await getSuscripcionActiva(fila.email)
  const base =
    activa?.pagada_hasta && new Date(activa.pagada_hasta) > new Date()
      ? new Date(activa.pagada_hasta)
      : new Date()
  const hasta = new Date(base)
  hasta.setMonth(hasta.getMonth() + 1)

  const { error } = await supabaseAdmin
    .from('suscripciones')
    .update({
      estado: 'ACTIVA',
      wompi_transaction_id: wompiTransactionId,
      pagada_hasta: hasta.toISOString(),
    })
    .eq('referencia', referencia)
    .eq('estado', 'PENDIENTE')
  if (error) throw error
}

// Pago DECLINED/ERROR/VOIDED. Solo pisa filas aún pendientes.
export async function marcarRechazada(
  referencia: string,
  wompiTransactionId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('suscripciones')
    .update({ estado: 'RECHAZADA', wompi_transaction_id: wompiTransactionId })
    .eq('referencia', referencia)
    .eq('estado', 'PENDIENTE')
  if (error) throw error
}

// Desuscripción: marca TODAS las filas del email como CANCELADA y el guard
// de admin bloquea la cuenta. Re-suscribirse desde /suscribirse crea una
// fila nueva que vuelve a habilitar el acceso.
export async function cancelarSuscripciones(email: string): Promise<void> {
  const e = email.trim().toLowerCase()
  if (!e) throw new SuscripcionError('email requerido', 400)
  const { error } = await supabaseAdmin
    .from('suscripciones')
    .update({ estado: 'CANCELADA', cancelada_at: new Date().toISOString() })
    .eq('email', e)
    .neq('estado', 'CANCELADA')
  if (error) throw error
}
