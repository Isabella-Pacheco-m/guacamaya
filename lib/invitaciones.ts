import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Miembro, Tenant } from '@/types'

export interface Invitacion {
  id: string
  tenant_id: string
  miembro_id: string
  token_hash: string
  expires_at: string
  used_at: string | null
  used_by_auth0_user_id: string | null
  created_at: string
}

export interface CreateInvitacionResult {
  invitacion: Invitacion
  token: string // plaintext — solo visible en la respuesta de creación
}

function generateToken(): string {
  // 32 bytes ≈ 256 bits, base64url ≈ 43 chars
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export class InvitacionError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'InvitacionError'
  }
}

export async function createInvitacion(
  tenantId: string,
  miembroId: string,
  ttlDays = 30
): Promise<CreateInvitacionResult> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const { data, error } = await supabaseAdmin.rpc('generate_invitacion', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_token_hash: tokenHash,
    p_ttl_days: ttlDays,
  })
  if (error) {
    if (error.message?.includes('miembro no encontrado')) {
      throw new InvitacionError('Miembro no encontrado', 404)
    }
    throw error
  }
  return { invitacion: data as Invitacion, token }
}

export async function redeemInvitacion(
  tenantId: string,
  token: string,
  auth0UserId: string
): Promise<{ miembro: Miembro }> {
  const tokenHash = hashToken(token)
  const { data, error } = await supabaseAdmin.rpc('redeem_invitacion', {
    p_tenant_id: tenantId,
    p_token_hash: tokenHash,
    p_auth0_user_id: auth0UserId,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('invitacion no encontrada')) {
      throw new InvitacionError('Enlace inválido', 404)
    }
    if (msg.includes('invitacion ya canjeada')) {
      throw new InvitacionError('Este enlace ya fue usado', 409)
    }
    if (msg.includes('invitacion expirada')) {
      throw new InvitacionError('Este enlace expiró', 410)
    }
    if (msg.includes('miembro ya vinculado a otro')) {
      throw new InvitacionError(
        'Este perfil ya está vinculado a otra cuenta',
        409
      )
    }
    if (msg.includes('auth0 user ya tiene un miembro')) {
      throw new InvitacionError(
        'Tu cuenta ya tiene un perfil en este negocio',
        409
      )
    }
    throw error
  }
  return data as { miembro: Miembro }
}

// Auto-registro: el usuario se une a la comunidad sin invitación por-miembro.
// Crea su fila en `miembros` vinculada a su auth0_user_id (con nombre/email de
// su perfil de Auth0). Idempotente: si ya es miembro de este tenant, lo
// devuelve sin duplicar (la unique (tenant_id, auth0_user_id) lo garantiza).
export async function selfRegisterMiembro(
  tenantId: string,
  auth0UserId: string,
  nombre: string,
  email: string | null
): Promise<Miembro> {
  const existing = await getMiembroByAuth0(tenantId, auth0UserId)
  if (existing) return existing

  const { data, error } = await supabaseAdmin
    .from('miembros')
    .insert({
      tenant_id: tenantId,
      auth0_user_id: auth0UserId,
      nombre: nombre.trim() || 'Cliente',
      email: email && email.trim() ? email.trim().toLowerCase() : null,
    })
    .select(
      'id, tenant_id, nombre, telefono, email, puntos_actuales, puntos_historicos, nivel, avatar_url'
    )
    .single()
  if (error) {
    // Carrera: otro request lo creó primero (unique tenant_id+auth0_user_id).
    if (error.code === '23505') {
      const again = await getMiembroByAuth0(tenantId, auth0UserId)
      if (again) return again
    }
    throw error
  }
  return data as Miembro
}

export async function getMiembroByAuth0(
  tenantId: string,
  auth0UserId: string
): Promise<Miembro | null> {
  const { data, error } = await supabaseAdmin.rpc('get_miembro_by_auth0', {
    p_tenant_id: tenantId,
    p_auth0_user_id: auth0UserId,
  })
  if (error) throw error
  if (!data || (data as Miembro).id == null) return null
  return data as Miembro
}

// Lookup global por auth0_user_id (sin saber tenant). Lo usa el landing root
// cuando el cliente acaba de canjear: el JWT del cliente NO lleva tenantId
// (eso vive solo en nuestra DB), así que hay que resolver el tenant desde
// la fila `miembros`. Bypassa RLS — uso sólo de servidor.
export async function findMiembroByAuth0(
  auth0UserId: string
): Promise<{ miembro: Miembro; tenant: Pick<Tenant, 'id' | 'slug' | 'nombre'> } | null> {
  const { data, error } = await supabaseAdmin
    .from('miembros')
    .select(
      'id, tenant_id, nombre, telefono, email, puntos_actuales, puntos_historicos, nivel, avatar_url, tenants ( id, slug, nombre )'
    )
    .eq('auth0_user_id', auth0UserId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const tenants = (data as any).tenants
  const tenant = Array.isArray(tenants) ? tenants[0] : tenants
  if (!tenant) return null
  const { tenants: _drop, ...rest } = data as any
  return { miembro: rest as Miembro, tenant }
}

// Resuelve tenant_id de una invitación desde el token plano. Útil cuando la
// página /invite no tiene subdominio (caller puede estar en localhost root):
// el token es único globalmente y nos dice a qué tenant pertenece.
export async function getTenantIdByToken(
  token: string
): Promise<string | null> {
  const tokenHash = hashToken(token)
  const { data, error } = await supabaseAdmin
    .from('invitaciones')
    .select('tenant_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (error) throw error
  return data?.tenant_id ?? null
}

export async function listInvitacionesForMiembro(
  tenantId: string,
  miembroId: string
): Promise<Invitacion[]> {
  const { data, error } = await supabaseAdmin.rpc(
    'list_invitaciones_for_miembro',
    {
      p_tenant_id: tenantId,
      p_miembro_id: miembroId,
    }
  )
  if (error) throw error
  return (data ?? []) as Invitacion[]
}
