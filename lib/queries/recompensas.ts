// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Miembro, Recompensa, Transaccion } from '@/types'

// =====================================================================
// Recompensas
// =====================================================================

export interface CreateRecompensaInput {
  nombre: string
  costo_puntos: number
  descripcion?: string | null
  imagen_url?: string | null
}

export interface UpdateRecompensaInput {
  nombre?: string | null
  descripcion?: string | null
  costo_puntos?: number | null
  activa?: boolean | null
  imagen_url?: string | null
}

export async function listRecompensas(tenantId: string): Promise<Recompensa[]> {
  const { data, error } = await supabaseAdmin.rpc('list_recompensas', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as Recompensa[]
}

export async function getRecompensaById(
  tenantId: string,
  id: string
): Promise<Recompensa | null> {
  const { data, error } = await supabaseAdmin
    .from('recompensas')
    .select('id, tenant_id, nombre, descripcion, costo_puntos, activa, imagen_url')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Recompensa | null) ?? null
}

export async function listRecompensasActivas(
  tenantId: string
): Promise<Recompensa[]> {
  const { data, error } = await supabaseAdmin.rpc('list_recompensas_activas', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as Recompensa[]
}

export async function createRecompensa(
  tenantId: string,
  input: CreateRecompensaInput
): Promise<Recompensa> {
  const { data, error } = await supabaseAdmin.rpc('create_recompensa', {
    p_tenant_id: tenantId,
    p_nombre: input.nombre,
    p_costo_puntos: input.costo_puntos,
    p_descripcion: input.descripcion ?? null,
    p_imagen_url: input.imagen_url ?? null,
  })
  if (error) throw error
  return data as Recompensa
}

export class RecompensaNotFoundError extends Error {
  constructor() {
    super('Recompensa no encontrada')
    this.name = 'RecompensaNotFoundError'
  }
}

export async function updateRecompensa(
  tenantId: string,
  id: string,
  input: UpdateRecompensaInput
): Promise<Recompensa> {
  const { data, error } = await supabaseAdmin.rpc('update_recompensa', {
    p_tenant_id: tenantId,
    p_id: id,
    p_nombre: input.nombre ?? null,
    p_descripcion: input.descripcion ?? null,
    p_costo_puntos: input.costo_puntos ?? null,
    p_activa: input.activa ?? null,
    p_imagen_url: input.imagen_url ?? null,
  })
  if (error) {
    if (error.message?.includes('recompensa no encontrada')) {
      throw new RecompensaNotFoundError()
    }
    throw error
  }
  return data as Recompensa
}

// Borrado duro, tenant-scoped. Es seguro: ninguna tabla referencia
// recompensas por FK — el canje denormaliza el nombre en transacciones.nota,
// así que el historial se conserva aunque se borre la recompensa.
export async function deleteRecompensa(
  tenantId: string,
  id: string
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('recompensas')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new RecompensaNotFoundError()
}

// =====================================================================
// Canjes
// =====================================================================

export interface CanjeResult {
  miembro: Miembro
  transaccion: Transaccion
  recompensa: Recompensa
}

export class CanjeError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'CanjeError'
  }
}

export async function registerCanje(
  tenantId: string,
  miembroId: string,
  recompensaId: string
): Promise<CanjeResult> {
  const { data, error } = await supabaseAdmin.rpc('register_canje', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_recompensa_id: recompensaId,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('recompensa no encontrada')) {
      throw new CanjeError('Recompensa no encontrada', 404)
    }
    if (msg.includes('recompensa no activa')) {
      throw new CanjeError('Recompensa no activa', 409)
    }
    if (msg.includes('miembro no encontrado')) {
      throw new CanjeError('Miembro no encontrado', 404)
    }
    if (msg.includes('puntos insuficientes')) {
      throw new CanjeError('Puntos insuficientes', 409)
    }
    throw error
  }
  return data as CanjeResult
}
