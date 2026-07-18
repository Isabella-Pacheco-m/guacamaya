// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  DEFAULT_TENANT_FEATURES,
  FEATURE_KEYS,
  TARJETA_ESTILOS,
  TARJETA_FONDO_TIPOS,
  mergeTenantFeatures,
  type FeatureKey,
  type TarjetaEstilo,
  type TarjetaFondoTipo,
  type TenantFeatures,
} from '@/lib/tarjeta'
import { isUndefinedColumn, warnSchemaDrift } from '@/lib/schema-drift'

// Re-export para no romper imports existentes (`from '@/lib/tenant-features'`).
// Las constantes/tipos puros viven en lib/tarjeta.ts; aquí solo la capa de datos.
export { FEATURE_KEYS, TARJETA_ESTILOS, TARJETA_FONDO_TIPOS }
export type { FeatureKey, TarjetaEstilo, TarjetaFondoTipo, TenantFeatures }

// Los defaults viven en lib/tarjeta.ts (módulo puro) junto al tipo.
const DEFAULT_FLAGS = DEFAULT_TENANT_FEATURES

const SELECT =
  'tenant_id, feed_enabled, sorteos_enabled, tarjeta_enabled, cumpleanos_enabled, notas_enabled, galeria_enabled, galeria_puntos, lanzamientos_enabled, retos_enabled, ranking_enabled, feed_miembros_pueden_publicar, registro_abierto, tarjeta_size, sello_valor_cop, tarjeta_color_fondo, tarjeta_color_sello, tarjeta_estilo_sello, tarjeta_fondo_tipo, tarjeta_color_fondo2, tarjeta_sello_url'

export async function getTenantFeatures(tenantId: string): Promise<TenantFeatures> {
  const { data, error } = await supabaseAdmin
    .from('tenant_features')
    .select(SELECT)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    // Camino normal: cualquier otro error sí es un fallo real.
    if (!isUndefinedColumn(error)) throw error

    // Migración pendiente: en vez de tumbar la home del tenant, releemos con
    // `*` y completamos con defaults. Las features cuya columna aún no existe
    // quedan apagadas hasta que se apliquen las migraciones.
    warnSchemaDrift('getTenantFeatures', error)
    const { data: loose, error: looseErr } = await supabaseAdmin
      .from('tenant_features')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (looseErr) throw looseErr
    return mergeTenantFeatures(tenantId, loose as Record<string, unknown> | null)
  }

  if (!data) return { tenant_id: tenantId, ...DEFAULT_FLAGS }
  return data as TenantFeatures
}

export async function ensureTenantFeaturesRow(tenantId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('tenant_features')
    .upsert({ tenant_id: tenantId }, { onConflict: 'tenant_id', ignoreDuplicates: true })
  if (error) throw error
}

export interface TenantFeaturesPatch {
  feed_enabled?: boolean
  sorteos_enabled?: boolean
  tarjeta_enabled?: boolean
  cumpleanos_enabled?: boolean
  notas_enabled?: boolean
  galeria_enabled?: boolean
  galeria_puntos?: number
  lanzamientos_enabled?: boolean
  retos_enabled?: boolean
  ranking_enabled?: boolean
  feed_miembros_pueden_publicar?: boolean
  registro_abierto?: boolean
  tarjeta_size?: number
  sello_valor_cop?: number | null
  tarjeta_color_fondo?: string
  tarjeta_color_sello?: string
  tarjeta_estilo_sello?: TarjetaEstilo
  tarjeta_fondo_tipo?: TarjetaFondoTipo
  tarjeta_color_fondo2?: string | null
  tarjeta_sello_url?: string | null
}

const HEX_RE = /^#[0-9a-f]{6}$/i

export class TenantFeaturesError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TenantFeaturesError'
  }
}

export async function updateTenantFeatures(
  tenantId: string,
  patch: TenantFeaturesPatch
): Promise<TenantFeatures> {
  const sanitized: Record<string, boolean | number | string | null> = {}
  for (const k of FEATURE_KEYS) {
    const v = patch[k]
    if (typeof v === 'boolean') sanitized[k] = v
  }
  // Sub-ajuste del feed (no es una feature de primer nivel, va aparte).
  if (typeof patch.feed_miembros_pueden_publicar === 'boolean') {
    sanitized.feed_miembros_pueden_publicar = patch.feed_miembros_pueden_publicar
  }
  if (typeof patch.registro_abierto === 'boolean') {
    sanitized.registro_abierto = patch.registro_abierto
  }
  if (patch.tarjeta_size !== undefined) {
    const v = patch.tarjeta_size
    if (!Number.isInteger(v) || v < 1 || v > 100) {
      throw new TenantFeaturesError(
        'tarjeta_size debe ser entero entre 1 y 100',
        400
      )
    }
    sanitized.tarjeta_size = v
  }
  if (patch.galeria_puntos !== undefined) {
    const v = patch.galeria_puntos
    if (!Number.isInteger(v) || v < 0 || v > 100000) {
      throw new TenantFeaturesError(
        'galeria_puntos debe ser entero entre 0 y 100000',
        400
      )
    }
    sanitized.galeria_puntos = v
  }
  if (patch.sello_valor_cop !== undefined) {
    const v = patch.sello_valor_cop
    if (v === null) {
      sanitized.sello_valor_cop = null
    } else if (!Number.isInteger(v) || v <= 0) {
      throw new TenantFeaturesError(
        'sello_valor_cop debe ser entero positivo o null',
        400
      )
    } else {
      sanitized.sello_valor_cop = v
    }
  }
  if (patch.tarjeta_color_fondo !== undefined) {
    if (!HEX_RE.test(patch.tarjeta_color_fondo)) {
      throw new TenantFeaturesError(
        'tarjeta_color_fondo debe ser hex #RRGGBB',
        400
      )
    }
    sanitized.tarjeta_color_fondo = patch.tarjeta_color_fondo.toUpperCase()
  }
  if (patch.tarjeta_color_sello !== undefined) {
    if (!HEX_RE.test(patch.tarjeta_color_sello)) {
      throw new TenantFeaturesError(
        'tarjeta_color_sello debe ser hex #RRGGBB',
        400
      )
    }
    sanitized.tarjeta_color_sello = patch.tarjeta_color_sello.toUpperCase()
  }
  if (patch.tarjeta_estilo_sello !== undefined) {
    if (!TARJETA_ESTILOS.includes(patch.tarjeta_estilo_sello)) {
      throw new TenantFeaturesError(
        `tarjeta_estilo_sello debe ser uno de: ${TARJETA_ESTILOS.join(', ')}`,
        400
      )
    }
    sanitized.tarjeta_estilo_sello = patch.tarjeta_estilo_sello
  }
  if (patch.tarjeta_fondo_tipo !== undefined) {
    if (!TARJETA_FONDO_TIPOS.includes(patch.tarjeta_fondo_tipo)) {
      throw new TenantFeaturesError(
        `tarjeta_fondo_tipo debe ser uno de: ${TARJETA_FONDO_TIPOS.join(', ')}`,
        400
      )
    }
    sanitized.tarjeta_fondo_tipo = patch.tarjeta_fondo_tipo
  }
  if (patch.tarjeta_color_fondo2 !== undefined) {
    if (patch.tarjeta_color_fondo2 === null) {
      sanitized.tarjeta_color_fondo2 = null
    } else if (!HEX_RE.test(patch.tarjeta_color_fondo2)) {
      throw new TenantFeaturesError(
        'tarjeta_color_fondo2 debe ser hex #RRGGBB o null',
        400
      )
    } else {
      sanitized.tarjeta_color_fondo2 = patch.tarjeta_color_fondo2.toUpperCase()
    }
  }
  // tarjeta_sello_url se setea desde la ruta de subida /api/tenant/tarjeta-sello,
  // no por este PATCH — pero se permite null aquí para poder limpiarla.
  if (patch.tarjeta_sello_url !== undefined) {
    if (patch.tarjeta_sello_url === null) {
      sanitized.tarjeta_sello_url = null
    } else if (typeof patch.tarjeta_sello_url === 'string') {
      sanitized.tarjeta_sello_url = patch.tarjeta_sello_url
    }
  }
  if (Object.keys(sanitized).length === 0) {
    throw new TenantFeaturesError('Sin cambios', 400)
  }
  const { data, error } = await supabaseAdmin
    .from('tenant_features')
    .upsert(
      {
        tenant_id: tenantId,
        ...sanitized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )
    .select(SELECT)
    .single()
  if (error) throw error
  return data as TenantFeatures
}
