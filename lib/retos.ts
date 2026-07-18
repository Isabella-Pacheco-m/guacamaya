// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Miembro } from '@/types'

// Tipos importables con `import type` desde componentes cliente. No importar
// VALORES desde 'use client'.

export const RETOS_BUCKET = 'business_media'
export const RETO_MAX_BYTES = 5 * 1024 * 1024
export const RETO_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type RetoEstado = 'ABIERTO' | 'CERRADO'
export type RetoPartEstado = 'pendiente' | 'cumplido' | 'rechazado'

export interface Reto {
  id: string
  tenant_id: string
  titulo: string
  descripcion: string | null
  requisitos: string | null
  imagen_url: string | null
  puntos: number
  cierra_at: string | null
  estado: RetoEstado
  created_at: string
}

export interface RetoAdmin extends Reto {
  participaciones_count: number
  pendientes_count: number
}

export interface RetoConMeta extends Reto {
  participaciones_count: number
  cumplidos_count: number
}

export interface RetoParticipacion {
  id: string
  reto_id: string
  tenant_id: string
  miembro_id: string
  evidencia_url: string | null
  comentario: string | null
  estado: RetoPartEstado
  puntos_otorgados: number
  created_at: string
  revisado_at: string | null
}

export interface RetoParticipacionAdmin {
  id: string
  miembro_id: string
  miembro_nombre: string
  miembro_telefono: string | null
  evidencia_url: string | null
  comentario: string | null
  estado: RetoPartEstado
  puntos_otorgados: number
  created_at: string
  revisado_at: string | null
}

export class RetoError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'RetoError'
  }
}

function handleRpcError(error: { message?: string }): never {
  const msg = error.message || ''
  if (msg.includes('titulo no puede estar vacio')) throw new RetoError('El título no puede estar vacío', 400)
  if (msg.includes('reto no encontrado o ya cerrado')) throw new RetoError('El reto no se puede cerrar', 409)
  if (msg.includes('reto no encontrado')) throw new RetoError('Reto no encontrado', 404)
  if (msg.includes('reto no esta abierto')) throw new RetoError('Este reto ya no acepta participaciones', 409)
  if (msg.includes('ya participaste')) throw new RetoError('Ya participaste en este reto', 409)
  if (msg.includes('participacion no encontrada')) throw new RetoError('Participación no encontrada', 404)
  if (msg.includes('participacion ya revisada')) throw new RetoError('Esta participación ya fue revisada', 409)
  throw error
}

export function retoCoverPrefix(tenantId: string): string {
  return `tenants/${tenantId}/retos/`
}
export function retoEvidenciaPrefix(tenantId: string, retoId: string): string {
  return `tenants/${tenantId}/retos/${retoId}/evidencias/`
}
export function retoPathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${RETOS_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

export async function listRetosAdmin(tenantId: string): Promise<RetoAdmin[]> {
  const { data, error } = await supabaseAdmin.rpc('list_retos_admin', { p_tenant_id: tenantId })
  if (error) throw error
  return (data ?? []) as RetoAdmin[]
}

export async function listRetosPwa(tenantId: string): Promise<Reto[]> {
  const { data, error } = await supabaseAdmin.rpc('list_retos_pwa', { p_tenant_id: tenantId })
  if (error) throw error
  return (data ?? []) as Reto[]
}

export async function getReto(tenantId: string, id: string): Promise<RetoConMeta | null> {
  const { data, error } = await supabaseAdmin.rpc('get_reto', { p_tenant_id: tenantId, p_id: id })
  if (error) throw error
  const rows = (data ?? []) as RetoConMeta[]
  return rows[0] ?? null
}

export async function listRetoParticipaciones(
  tenantId: string,
  retoId: string
): Promise<RetoParticipacionAdmin[]> {
  const { data, error } = await supabaseAdmin.rpc('list_reto_participaciones', {
    p_tenant_id: tenantId,
    p_reto_id: retoId,
  })
  if (error) throw error
  return (data ?? []) as RetoParticipacionAdmin[]
}

export interface CreateRetoInput {
  titulo: string
  descripcion?: string | null
  requisitos?: string | null
  imagenUrl?: string | null
  puntos?: number
  cierraAt?: string | null
}

export async function createReto(tenantId: string, input: CreateRetoInput): Promise<Reto> {
  const { data, error } = await supabaseAdmin.rpc('create_reto', {
    p_tenant_id: tenantId,
    p_titulo: input.titulo,
    p_descripcion: input.descripcion ?? null,
    p_requisitos: input.requisitos ?? null,
    p_imagen_url: input.imagenUrl ?? null,
    p_puntos: input.puntos ?? 0,
    p_cierra_at: input.cierraAt ?? null,
  })
  if (error) handleRpcError(error)
  return data as Reto
}

export async function closeReto(tenantId: string, id: string): Promise<Reto> {
  const { data, error } = await supabaseAdmin.rpc('close_reto', { p_tenant_id: tenantId, p_id: id })
  if (error) handleRpcError(error)
  return data as Reto
}

export interface DeletedRetoFiles {
  imagenUrl: string | null
  evidencias: string[]
}

export async function deleteReto(tenantId: string, id: string): Promise<DeletedRetoFiles> {
  const { data, error } = await supabaseAdmin.rpc('delete_reto', { p_tenant_id: tenantId, p_id: id })
  if (error) handleRpcError(error)
  const row = (data ?? [])[0] as { imagen_url: string | null; evidencias: string[] } | undefined
  return { imagenUrl: row?.imagen_url ?? null, evidencias: row?.evidencias ?? [] }
}

export async function deleteRetoFiles({ imagenUrl, evidencias }: DeletedRetoFiles): Promise<void> {
  const paths: string[] = []
  if (imagenUrl) {
    const p = retoPathFromPublicUrl(imagenUrl)
    if (p) paths.push(p)
  }
  for (const url of evidencias) {
    const p = retoPathFromPublicUrl(url)
    if (p) paths.push(p)
  }
  if (paths.length === 0) return
  await supabaseAdmin.storage.from(RETOS_BUCKET).remove(paths).catch(() => {})
}

export interface ParticiparRetoInput {
  evidenciaUrl?: string | null
  comentario?: string | null
}

export async function participarReto(
  tenantId: string,
  retoId: string,
  miembroId: string,
  input: ParticiparRetoInput
): Promise<RetoParticipacion> {
  const { data, error } = await supabaseAdmin.rpc('participar_reto', {
    p_tenant_id: tenantId,
    p_reto_id: retoId,
    p_miembro_id: miembroId,
    p_evidencia_url: input.evidenciaUrl ?? null,
    p_comentario: input.comentario ?? null,
  })
  if (error) handleRpcError(error)
  return data as RetoParticipacion
}

export async function getMiParticipacionReto(
  tenantId: string,
  retoId: string,
  miembroId: string
): Promise<RetoParticipacion | null> {
  const { data, error } = await supabaseAdmin.rpc('get_mi_participacion_reto', {
    p_tenant_id: tenantId,
    p_reto_id: retoId,
    p_miembro_id: miembroId,
  })
  if (error) throw error
  const rows = (data ?? []) as RetoParticipacion[]
  return rows[0] ?? null
}

export async function revisarRetoParticipacion(
  tenantId: string,
  participacionId: string,
  cumplido: boolean,
  puntos: number
): Promise<{ participacion: RetoParticipacion; miembro: Miembro }> {
  const { data, error } = await supabaseAdmin.rpc('revisar_reto_participacion', {
    p_tenant_id: tenantId,
    p_participacion_id: participacionId,
    p_cumplido: cumplido,
    p_puntos: puntos,
  })
  if (error) handleRpcError(error)
  return data as { participacion: RetoParticipacion; miembro: Miembro }
}
