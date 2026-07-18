// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  isMissingFunction,
  isUndefinedColumn,
  warnSchemaDrift,
} from '@/lib/schema-drift'
import type { Miembro, Recompensa, Transaccion } from '@/types'
import type { Nota } from '@/lib/notas'
import type { ProximaCaducidad } from '@/lib/caducidad'

export interface CreateMiembroInput {
  nombre: string
  telefono?: string | null
  email?: string | null
}

export async function listMiembros(tenantId: string): Promise<Miembro[]> {
  const { data, error } = await supabaseAdmin.rpc('list_miembros', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as Miembro[]
}

export async function createMiembro(
  tenantId: string,
  input: CreateMiembroInput
): Promise<Miembro> {
  const { data, error } = await supabaseAdmin.rpc('create_miembro', {
    p_tenant_id: tenantId,
    p_nombre: input.nombre,
    p_telefono: input.telefono ?? null,
    p_email: input.email ?? null,
  })
  if (error) throw error
  return data as Miembro
}

// Setea (o limpia con url=null) la foto de perfil del miembro. Tenant-scoped.
export async function setMiembroAvatar(
  tenantId: string,
  miembroId: string,
  url: string | null
): Promise<Miembro> {
  const { data, error } = await supabaseAdmin.rpc('set_miembro_avatar', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_url: url,
  })
  if (error) throw error
  return data as Miembro
}

export async function getMiembroById(
  tenantId: string,
  miembroId: string
): Promise<Miembro | null> {
  const { data, error } = await supabaseAdmin.rpc('get_miembro_by_id', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
  })
  if (error) throw error
  if (!data || (data as Miembro).id == null) return null
  return data as Miembro
}

export interface CompraResult {
  miembro: Miembro
  transaccion: Transaccion
}

export class CompraError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'CompraError'
  }
}

export async function registerCompra(
  tenantId: string,
  miembroId: string,
  montoCop: number
): Promise<CompraResult> {
  const { data, error } = await supabaseAdmin.rpc('register_compra', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_monto_cop: montoCop,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('miembro no encontrado')) {
      throw new CompraError('Miembro no encontrado', 404)
    }
    if (msg.includes('monto_cop debe ser positivo')) {
      throw new CompraError('Monto debe ser positivo', 400)
    }
    throw error
  }
  return data as CompraResult
}

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

export async function listTransaccionesForMiembro(
  tenantId: string,
  miembroId: string,
  limit = 50
): Promise<Transaccion[]> {
  const { data, error } = await supabaseAdmin.rpc(
    'list_transacciones_for_miembro',
    {
      p_tenant_id: tenantId,
      p_miembro_id: miembroId,
      p_limit: limit,
    }
  )
  if (error) throw error
  return (data ?? []) as Transaccion[]
}

// =====================================================================
// Caducidad de puntos
// =====================================================================

/**
 * Próximo lote de puntos por vencer del miembro. Tolera migración pendiente:
 * si 0032 aún no corrió, la PWA simplemente no muestra el aviso en vez de
 * romper la pantalla de puntos.
 */
export async function getProximaCaducidad(
  tenantId: string,
  miembroId: string
): Promise<ProximaCaducidad> {
  const { data, error } = await supabaseAdmin.rpc('get_proxima_caducidad', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
  })
  if (error) {
    if (isMissingFunction(error) || isUndefinedColumn(error)) {
      warnSchemaDrift('getProximaCaducidad', error)
      return { meses: null, puntos: 0, fecha: null }
    }
    throw error
  }
  return data as ProximaCaducidad
}

// =====================================================================
// Métricas
// =====================================================================

export interface MetricasResumen {
  dias: number
  desde: string
  miembros_nuevos: number
  compras_count: number
  compras_monto_cop: number
  canjes_count: number
  puntos_emitidos: number
  puntos_canjeados: number
}

export async function getMetricasResumen(
  tenantId: string,
  dias = 30
): Promise<MetricasResumen> {
  const { data, error } = await supabaseAdmin.rpc('get_metricas_resumen', {
    p_tenant_id: tenantId,
    p_dias: dias,
  })
  if (error) throw error
  return data as MetricasResumen
}

// =====================================================================
// Inactivos
// =====================================================================

export interface MiembroInactivo {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  puntos_actuales: number
  nivel: 'BRONCE' | 'PLATA' | 'ORO'
  ultima_compra: string | null
  dias_inactivo: number
}

export async function listMiembrosInactivos(
  tenantId: string,
  dias = 30,
  limit = 200
): Promise<MiembroInactivo[]> {
  const { data, error } = await supabaseAdmin.rpc('get_miembros_inactivos', {
    p_tenant_id: tenantId,
    p_dias: dias,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as MiembroInactivo[]
}

// =====================================================================
// Cumpleaños — segmento mensual
// =====================================================================

export async function listCumpleanerosDelMes(
  tenantId: string,
  mes: number
): Promise<Miembro[]> {
  const { data, error } = await supabaseAdmin.rpc('list_cumpleaneros_del_mes', {
    p_tenant_id: tenantId,
    p_mes: mes,
  })
  if (error) throw error
  return (data ?? []) as Miembro[]
}

export class MesCumpleanosError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'MesCumpleanosError'
  }
}

export async function setMesCumpleanos(
  tenantId: string,
  miembroId: string,
  mes: number | null
): Promise<Miembro> {
  const { data, error } = await supabaseAdmin.rpc('set_mes_cumpleanos', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_mes: mes,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('miembro no encontrado')) {
      throw new MesCumpleanosError('Miembro no encontrado', 404)
    }
    if (msg.includes('mes ya definido')) {
      throw new MesCumpleanosError(
        'Ya registraste tu mes de cumpleaños y no se puede cambiar.',
        409
      )
    }
    if (msg.includes('mes debe estar')) {
      throw new MesCumpleanosError('El mes debe ser un número entre 1 y 12', 400)
    }
    throw error
  }
  return data as Miembro
}

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

// =====================================================================
// Notas (post-it de la marca)
// =====================================================================

export class NotaError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'NotaError'
  }
}

export async function listNotas(tenantId: string, limit = 50): Promise<Nota[]> {
  const { data, error } = await supabaseAdmin.rpc('list_notas', {
    p_tenant_id: tenantId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as Nota[]
}

export async function createNota(
  tenantId: string,
  cuerpo: string,
  color: string,
  pinned: boolean
): Promise<Nota> {
  const { data, error } = await supabaseAdmin.rpc('create_nota', {
    p_tenant_id: tenantId,
    p_cuerpo: cuerpo,
    p_color: color,
    p_pinned: pinned,
  })
  if (error) {
    if ((error.message || '').includes('cuerpo no puede estar vacio')) {
      throw new NotaError('El mensaje no puede estar vacío', 400)
    }
    throw error
  }
  return data as Nota
}

export async function deleteNota(tenantId: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('delete_nota', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) {
    if ((error.message || '').includes('nota no encontrada')) {
      throw new NotaError('Nota no encontrada', 404)
    }
    throw error
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
