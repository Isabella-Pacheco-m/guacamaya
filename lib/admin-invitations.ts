import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AdminInvitation {
  id: string
  tenant_id: string
  email: string | null
  token_hash: string
  expires_at: string
  used_at: string | null
  used_by_auth0_user_id: string | null
  created_by_email: string | null
  created_at: string
}

export interface CreateAdminInvitationInput {
  tenantId: string
  email?: string | null
  ttlDays?: number
  createdByEmail?: string | null
}

export interface CreateAdminInvitationResult {
  invitation: AdminInvitation
  token: string // plaintext — solo en la respuesta de creación
}

export class AdminInvitationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'AdminInvitationError'
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createAdminInvitation(
  input: CreateAdminInvitationInput
): Promise<CreateAdminInvitationResult> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const { data, error } = await supabaseAdmin.rpc('generate_admin_invitation', {
    p_tenant_id: input.tenantId,
    p_email: input.email ?? null,
    p_token_hash: tokenHash,
    p_ttl_days: input.ttlDays ?? 7,
    p_created_by_email: input.createdByEmail ?? null,
  })
  if (error) {
    if (error.message?.includes('tenant no encontrado')) {
      throw new AdminInvitationError('Tenant no encontrado', 404)
    }
    throw error
  }
  return { invitation: data as AdminInvitation, token }
}

export async function getAdminInvitationByToken(
  token: string
): Promise<AdminInvitation | null> {
  const tokenHash = hashToken(token)
  const { data, error } = await supabaseAdmin.rpc(
    'get_admin_invitation_by_token',
    { p_token_hash: tokenHash }
  )
  if (error) throw error
  if (!data || (data as AdminInvitation).id == null) return null
  return data as AdminInvitation
}

export async function consumeAdminInvitation(
  token: string,
  auth0UserId: string
): Promise<AdminInvitation> {
  const tokenHash = hashToken(token)
  const { data, error } = await supabaseAdmin.rpc('consume_admin_invitation', {
    p_token_hash: tokenHash,
    p_auth0_user_id: auth0UserId,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('invitacion no encontrada')) {
      throw new AdminInvitationError('Enlace inválido', 404)
    }
    if (msg.includes('invitacion ya canjeada')) {
      throw new AdminInvitationError('Este enlace ya fue usado', 409)
    }
    if (msg.includes('invitacion expirada')) {
      throw new AdminInvitationError('Este enlace expiró', 410)
    }
    throw error
  }
  return data as AdminInvitation
}

export async function listAdminInvitationsForTenant(
  tenantId: string
): Promise<AdminInvitation[]> {
  const { data, error } = await supabaseAdmin.rpc(
    'list_admin_invitations_for_tenant',
    { p_tenant_id: tenantId }
  )
  if (error) throw error
  return (data ?? []) as AdminInvitation[]
}
