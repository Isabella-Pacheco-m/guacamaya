import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureTenantFeaturesRow } from '@/lib/tenant-features'
import type { Tenant } from '@/types'

export class TenantNotFoundError extends Error {
  constructor(public readonly slug: string | null) {
    super(
      slug
        ? `Tenant '${slug}' no encontrado`
        : 'Request sin x-tenant-slug (subdominio inválido)'
    )
    this.name = 'TenantNotFoundError'
  }
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, nombre, slug, logo_url, color_primario, puntos_por_mil, puntos_cumpleanos')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return (data as Tenant | null) ?? null
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, nombre, slug, logo_url, color_primario, puntos_por_mil, puntos_cumpleanos')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data as Tenant | null) ?? null
}

export async function getTenantFromRequest(): Promise<Tenant> {
  const slug = headers().get('x-tenant-slug')
  if (!slug) throw new TenantNotFoundError(null)

  const tenant = await getTenantBySlug(slug)
  if (!tenant) throw new TenantNotFoundError(slug)

  return tenant
}

export interface UpdateTenantInput {
  nombre?: string
  color_primario?: string
  puntos_cumpleanos?: number | null
}

export class TenantUpdateError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TenantUpdateError'
  }
}

const HEX_RE = /^#[0-9a-f]{6}$/i

// Slugs reservados — son rutas top-level del app o convenciones de
// subdominio que no podemos ceder a tenants. Si se agrega una ruta
// nueva en `app/`, agregarla acá también.
const RESERVED_SLUGS = new Set([
  'admin',
  'admin-claim',
  'api',
  'auth',
  'canjear',
  'feed',
  'invite',
  'puntos',
  'recompensas',
  'sorteos',
  'superadmin',
  'www',
])

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/

export function validateSlug(raw: string): string {
  const slug = raw.trim().toLowerCase()
  if (!SLUG_RE.test(slug)) {
    throw new TenantUpdateError(
      'slug debe tener 2-30 caracteres, letras minúsculas, números y guiones (sin guion al inicio/fin)',
      400
    )
  }
  if (slug.includes('--')) {
    throw new TenantUpdateError('slug no puede tener guiones consecutivos', 400)
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new TenantUpdateError(`slug '${slug}' está reservado`, 400)
  }
  return slug
}

export interface CreateTenantInput {
  nombre: string
  slug: string
  color_primario?: string
  puntos_por_mil?: number
  puntos_cumpleanos?: number | null
}

export class TenantCreateError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TenantCreateError'
  }
}

export async function listTenants(): Promise<Tenant[]> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select(
      'id, nombre, slug, logo_url, color_primario, puntos_por_mil, puntos_cumpleanos'
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Tenant[]
}

export async function createTenant(
  input: CreateTenantInput
): Promise<Tenant> {
  const nombre = input.nombre.trim()
  if (nombre.length === 0) {
    throw new TenantCreateError('nombre no puede estar vacío', 400)
  }
  if (nombre.length > 80) {
    throw new TenantCreateError('nombre máximo 80 caracteres', 400)
  }

  let slug: string
  try {
    slug = validateSlug(input.slug)
  } catch (err) {
    if (err instanceof TenantUpdateError) {
      throw new TenantCreateError(err.message, err.status)
    }
    throw err
  }

  const color = (input.color_primario ?? '#305CFF').trim()
  if (!HEX_RE.test(color)) {
    throw new TenantCreateError('color_primario debe ser hex #RRGGBB', 400)
  }

  const puntosPorMil = input.puntos_por_mil ?? 1
  if (!Number.isInteger(puntosPorMil) || puntosPorMil < 1 || puntosPorMil > 100) {
    throw new TenantCreateError(
      'puntos_por_mil debe ser entero entre 1 y 100',
      400
    )
  }

  const puntosCumple = input.puntos_cumpleanos ?? null
  if (
    puntosCumple !== null &&
    (!Number.isInteger(puntosCumple) ||
      puntosCumple < 0 ||
      puntosCumple > 100000)
  ) {
    throw new TenantCreateError(
      'puntos_cumpleanos debe ser entero entre 0 y 100000 (o null)',
      400
    )
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .insert({
      nombre,
      slug,
      color_primario: color.toUpperCase(),
      puntos_por_mil: puntosPorMil,
      puntos_cumpleanos: puntosCumple,
    })
    .select(
      'id, nombre, slug, logo_url, color_primario, puntos_por_mil, puntos_cumpleanos'
    )
    .single()

  if (error) {
    if (error.code === '23505') {
      // unique_violation — slug duplicado
      throw new TenantCreateError(`El slug '${slug}' ya está en uso`, 409)
    }
    throw error
  }
  await ensureTenantFeaturesRow((data as Tenant).id)
  return data as Tenant
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput
): Promise<Tenant> {
  const patch: Record<string, string | number | null> = {}

  if (input.nombre !== undefined) {
    const trimmed = input.nombre.trim()
    if (trimmed.length === 0) {
      throw new TenantUpdateError('nombre no puede estar vacío', 400)
    }
    patch.nombre = trimmed
  }

  if (input.color_primario !== undefined) {
    const trimmed = input.color_primario.trim()
    if (!HEX_RE.test(trimmed)) {
      throw new TenantUpdateError(
        'color_primario debe ser hex #RRGGBB',
        400
      )
    }
    patch.color_primario = trimmed.toUpperCase()
  }

  if (input.puntos_cumpleanos !== undefined) {
    const v = input.puntos_cumpleanos
    if (v === null) {
      patch.puntos_cumpleanos = null
    } else if (!Number.isInteger(v) || v < 0 || v > 100000) {
      throw new TenantUpdateError(
        'puntos_cumpleanos debe ser entero entre 0 y 100000 (o null)',
        400
      )
    } else {
      patch.puntos_cumpleanos = v
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new TenantUpdateError('Sin cambios', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update(patch)
    .eq('id', tenantId)
    .select('id, nombre, slug, logo_url, color_primario, puntos_por_mil, puntos_cumpleanos')
    .single()

  if (error) throw error
  return data as Tenant
}
