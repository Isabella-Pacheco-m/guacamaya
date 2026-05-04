import { supabaseAdmin } from '@/lib/supabase-admin'

export const FEATURE_KEYS = [
  'feed_enabled',
  'sorteos_enabled',
  'tarjeta_enabled',
  'cumpleanos_enabled',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export interface TenantFeatures {
  tenant_id: string
  feed_enabled: boolean
  sorteos_enabled: boolean
  tarjeta_enabled: boolean
  cumpleanos_enabled: boolean
  tarjeta_size: number
  sello_valor_cop: number | null
}

const DEFAULT_FLAGS: Omit<TenantFeatures, 'tenant_id'> = {
  feed_enabled: false,
  sorteos_enabled: false,
  tarjeta_enabled: false,
  cumpleanos_enabled: false,
  tarjeta_size: 10,
  sello_valor_cop: null,
}

const SELECT =
  'tenant_id, feed_enabled, sorteos_enabled, tarjeta_enabled, cumpleanos_enabled, tarjeta_size, sello_valor_cop'

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
  tarjeta_size?: number
  sello_valor_cop?: number | null
}

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
  const sanitized: Record<string, boolean | number | null> = {}
  for (const k of FEATURE_KEYS) {
    const v = patch[k]
    if (typeof v === 'boolean') sanitized[k] = v
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
