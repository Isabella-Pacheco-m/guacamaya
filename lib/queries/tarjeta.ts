// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Miembro } from '@/types'

// =====================================================================
// Tarjeta de fidelización (sellos)
// =====================================================================

export interface TarjetaPremio {
  threshold: number
  descripcion: string
}

export interface TarjetaPremioEstado extends TarjetaPremio {
  alcanzado: boolean
  canjeado: boolean
}

export class TarjetaError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TarjetaError'
  }
}

export async function registerSello(
  tenantId: string,
  miembroId: string,
  count = 1
): Promise<Miembro> {
  const { data, error } = await supabaseAdmin.rpc('register_sello', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_count: count,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('miembro no encontrado')) {
      throw new TarjetaError('Miembro no encontrado', 404)
    }
    if (msg.includes('count debe ser positivo')) {
      throw new TarjetaError('Cantidad debe ser positiva', 400)
    }
    throw error
  }
  return data as Miembro
}

export async function redeemPremioTarjeta(
  tenantId: string,
  miembroId: string,
  threshold: number
): Promise<Miembro> {
  const { data, error } = await supabaseAdmin.rpc('redeem_premio_tarjeta', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_threshold: threshold,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('miembro no encontrado')) {
      throw new TarjetaError('Miembro no encontrado', 404)
    }
    if (msg.includes('premio no encontrado')) {
      throw new TarjetaError('Premio no encontrado', 404)
    }
    if (msg.includes('sellos insuficientes')) {
      throw new TarjetaError('Sellos insuficientes', 409)
    }
    if (msg.includes('premio ya canjeado')) {
      throw new TarjetaError('Premio ya canjeado en este ciclo', 409)
    }
    throw error
  }
  return data as Miembro
}

export async function listTarjetaPremios(
  tenantId: string
): Promise<TarjetaPremio[]> {
  const { data, error } = await supabaseAdmin.rpc('list_tarjeta_premios', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as TarjetaPremio[]
}

export async function listTarjetaPremiosForMiembro(
  tenantId: string,
  miembroId: string
): Promise<TarjetaPremioEstado[]> {
  const { data, error } = await supabaseAdmin.rpc(
    'list_tarjeta_premios_for_miembro',
    { p_tenant_id: tenantId, p_miembro_id: miembroId }
  )
  if (error) {
    const msg = error.message || ''
    if (msg.includes('miembro no encontrado')) {
      throw new TarjetaError('Miembro no encontrado', 404)
    }
    throw error
  }
  return (data ?? []) as TarjetaPremioEstado[]
}

export async function upsertTarjetaPremio(
  tenantId: string,
  threshold: number,
  descripcion: string
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('upsert_tarjeta_premio', {
    p_tenant_id: tenantId,
    p_threshold: threshold,
    p_descripcion: descripcion,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('threshold debe ser positivo')) {
      throw new TarjetaError('El umbral debe ser positivo', 400)
    }
    if (msg.includes('descripcion no puede estar vacia')) {
      throw new TarjetaError('La descripción no puede estar vacía', 400)
    }
    throw error
  }
}

export async function deleteTarjetaPremio(
  tenantId: string,
  threshold: number
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('delete_tarjeta_premio', {
    p_tenant_id: tenantId,
    p_threshold: threshold,
  })
  if (error) throw error
}
