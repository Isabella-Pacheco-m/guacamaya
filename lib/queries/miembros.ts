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
import type { Miembro, Transaccion } from '@/types'
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
