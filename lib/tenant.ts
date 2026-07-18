// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import crypto from 'node:crypto'
import { cache } from 'react'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureTenantFeaturesRow } from '@/lib/tenant-features'
import { isUndefinedColumn, warnSchemaDrift } from '@/lib/schema-drift'
import { CADUCIDAD_MESES, esCaducidadValida } from '@/lib/caducidad'
import type { Tenant } from '@/types'

// Columnas públicas del tenant que se serializan al tipo `Tenant`. Nunca
// incluir admin_email ni join_code aquí (no deben filtrarse a la PWA).
const TENANT_COLS =
  'id, nombre, slug, logo_url, banner_url, color_primario, puntos_por_mil, puntos_cumpleanos, puntos_caducidad_meses'

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

// Lectura del tenant tolerante a migraciones pendientes. Estas dos funciones
// corren en CADA página de tenant, así que una columna faltante tumbaría todos
// los subdominios; ante 42703 releemos con `*` y normalizamos con defaults.
async function selectTenant(
  column: 'slug' | 'id',
  value: string
): Promise<Tenant | null> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select(TENANT_COLS)
    .eq(column, value)
    .maybeSingle()

  if (!error) return (data as Tenant | null) ?? null
  if (!isUndefinedColumn(error)) throw error

  warnSchemaDrift(`getTenantBy${column === 'slug' ? 'Slug' : 'Id'}`, error)
  const { data: loose, error: looseErr } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq(column, value)
    .maybeSingle()
  if (looseErr) throw looseErr
  if (!loose) return null

  const row = loose as Record<string, unknown>
  // Solo columnas públicas — nunca admin_email ni join_code (ver TENANT_COLS).
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    slug: row.slug as string,
    logo_url: (row.logo_url as string | null) ?? null,
    banner_url: (row.banner_url as string | null) ?? null,
    color_primario: (row.color_primario as string | null) ?? '#C2603C',
    puntos_por_mil: (row.puntos_por_mil as number | null) ?? 1,
    puntos_cumpleanos: (row.puntos_cumpleanos as number | null) ?? null,
    puntos_caducidad_meses:
      (row.puntos_caducidad_meses as number | null) ?? null,
  }
}

// cache() de React: memoiza POR REQUEST (no entre requests). Una página admin
// típica resuelve el tenant 2–3 veces (guard + layout + página); con esto la
// segunda llamada con el mismo argumento no vuelve a la DB. Solo lecturas —
// las mutaciones (updateTenant, etc.) no se envuelven jamás.
export const getTenantBySlug = cache(
  async (slug: string): Promise<Tenant | null> => selectTenant('slug', slug)
)

export const getTenantById = cache(
  async (id: string): Promise<Tenant | null> => selectTenant('id', id)
)

export async function getTenantFromRequest(): Promise<Tenant> {
  const slug = headers().get('x-tenant-slug')
  if (!slug) throw new TenantNotFoundError(null)

  const tenant = await getTenantBySlug(slug)
  if (!tenant) throw new TenantNotFoundError(slug)

  return tenant
}

/**
 * Cuántos miembros tiene el club. Se usa como prueba social en la landing
 * pre-login, así que nunca debe tumbar la página: ante cualquier error
 * devuelve 0 y la landing simplemente no muestra el dato.
 */
export async function countMiembros(tenantId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('miembros')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if (error) {
    console.error('countMiembros', error)
    return 0
  }
  return count ?? 0
}

export interface UpdateTenantInput {
  nombre?: string
  color_primario?: string
  puntos_cumpleanos?: number | null
  puntos_caducidad_meses?: number | null
}

export class TenantUpdateError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TenantUpdateError'
  }
}

const HEX_RE = /^#[0-9a-f]{6}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Slugs reservados — son rutas top-level del app o convenciones de
// subdominio que no podemos ceder a tenants. Si se agrega una ruta
// nueva en `app/`, agregarla acá también.
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'canjear',
  'comunidad',
  'feed',
  'galeria',
  'invite',
  'lanzamientos',
  'puntos',
  'recompensas',
  'retos',
  'sorteos',
  'superadmin',
  'unirse',
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
  admin_email: string
  color_primario?: string
  puntos_por_mil?: number
  puntos_cumpleanos?: number | null
}

// El admin del negocio se identifica por email asignado (no por claim de
// Auth0). Estas funciones NO devuelven admin_email en ningún objeto Tenant
// para no filtrar el correo a la PWA pública / al cliente.
export async function findTenantByAdminEmail(
  email: string
): Promise<{ id: string; slug: string } | null> {
  const e = email.trim().toLowerCase()
  if (!e) return null
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug')
    .eq('admin_email', e)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as { id: string; slug: string } | null) ?? null
}

// Memoizada por request (React cache): los guards de página y de API la
// llaman con los mismos argumentos dentro del mismo render.
export const isAdminOfTenant = cache(
  async (tenantId: string, email: string): Promise<boolean> => {
    const e = email.trim().toLowerCase()
    if (!e) return false
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .eq('admin_email', e)
      .maybeSingle()
    if (error) throw error
    return Boolean(data)
  }
)

// =====================================================================
// Enlace de invitación a la comunidad (join_code reusable por tenant)
// =====================================================================

// Resuelve el tenant desde el código de invitación (único global), igual que
// /invite resuelve por token. Lo usa /unirse/[code].
export async function getTenantByJoinCode(
  code: string
): Promise<{ id: string; slug: string; nombre: string } | null> {
  const c = code.trim()
  if (!c) return null
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, nombre')
    .eq('join_code', c)
    .maybeSingle()
  if (error) throw error
  return (data as { id: string; slug: string; nombre: string } | null) ?? null
}

export async function getJoinCode(tenantId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('join_code')
    .eq('id', tenantId)
    .maybeSingle()
  if (error) throw error
  return (data?.join_code as string | null) ?? null
}

// Genera (o rota) el código. Rotar invalida los enlaces anteriores.
export async function regenerateJoinCode(tenantId: string): Promise<string> {
  const code = crypto.randomBytes(9).toString('base64url') // ~12 chars
  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ join_code: code })
    .eq('id', tenantId)
  if (error) throw error
  return code
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
      TENANT_COLS
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

  const adminEmail = (input.admin_email ?? '').trim().toLowerCase()
  if (!adminEmail || !EMAIL_RE.test(adminEmail)) {
    throw new TenantCreateError('admin_email requerido y debe ser válido', 400)
  }

  const color = (input.color_primario ?? '#C2603C').trim()
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
      admin_email: adminEmail,
      color_primario: color.toUpperCase(),
      puntos_por_mil: puntosPorMil,
      puntos_cumpleanos: puntosCumple,
    })
    .select(
      TENANT_COLS
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

  if (input.puntos_caducidad_meses !== undefined) {
    const v = input.puntos_caducidad_meses
    if (v === null) {
      patch.puntos_caducidad_meses = null
    } else if (!esCaducidadValida(v)) {
      throw new TenantUpdateError(
        `puntos_caducidad_meses debe ser uno de: ${CADUCIDAD_MESES.join(', ')} (o null para no vencer)`,
        400
      )
    } else {
      patch.puntos_caducidad_meses = v
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new TenantUpdateError('Sin cambios', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update(patch)
    .eq('id', tenantId)
    .select(TENANT_COLS)
    .single()

  if (error) throw error
  return data as Tenant
}
