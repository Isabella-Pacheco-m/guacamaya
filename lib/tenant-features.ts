import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  FEATURE_KEYS,
  TARJETA_ESTILOS,
  type FeatureKey,
  type TarjetaEstilo,
  type TenantFeatures,
} from '@/lib/tarjeta'

// Re-export para no romper imports existentes (`from '@/lib/tenant-features'`).
// Las constantes/tipos puros viven en lib/tarjeta.ts; aquí solo la capa de datos.
export { FEATURE_KEYS, TARJETA_ESTILOS }
export type { FeatureKey, TarjetaEstilo, TenantFeatures }

const DEFAULT_FLAGS: Omit<TenantFeatures, 'tenant_id'> = {
  feed_enabled: false,
  sorteos_enabled: false,
  tarjeta_enabled: false,
  cumpleanos_enabled: false,
  feed_miembros_pueden_publicar: false,
  tarjeta_size: 10,
  sello_valor_cop: null,
  tarjeta_color_fondo: '#1A1A1E',
  tarjeta_color_sello: '#B8FA4E',
  tarjeta_estilo_sello: 'circulo',
}

const SELECT =
  'tenant_id, feed_enabled, sorteos_enabled, tarjeta_enabled, cumpleanos_enabled, feed_miembros_pueden_publicar, tarjeta_size, sello_valor_cop, tarjeta_color_fondo, tarjeta_color_sello, tarjeta_estilo_sello'

export async function getTenantFeatures(tenantId: string): Promise<TenantFeatures> {
  const { data, error } = await supabaseAdmin
    .from('tenant_features')
    .select(SELECT)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw error
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
  feed_miembros_pueden_publicar?: boolean
  tarjeta_size?: number
  sello_valor_cop?: number | null
  tarjeta_color_fondo?: string
  tarjeta_color_sello?: string
  tarjeta_estilo_sello?: TarjetaEstilo
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
