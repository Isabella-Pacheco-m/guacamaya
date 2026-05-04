import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  Sorteo,
  SorteoConMeta,
  SorteoParticipacion,
  SorteoParticipacionAdmin,
} from '@/types'

export const SORTEOS_BUCKET = 'business_media'
export const SORTEO_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
export const SORTEO_MAX_BYTES = 4 * 1024 * 1024

export function sorteoCoverPrefix(tenantId: string): string {
  return `tenants/${tenantId}/sorteos/`
}

export function sorteoEvidenciaPrefix(tenantId: string, sorteoId: string): string {
  return `tenants/${tenantId}/sorteos/${sorteoId}/evidencias/`
}

export function sorteoPathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${SORTEOS_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

export class SorteoError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'SorteoError'
  }
}

function handleRpcError(error: { message?: string }): never {
  const msg = error.message || ''
  if (msg.includes('titulo no puede estar vacio')) {
    throw new SorteoError('El título no puede estar vacío', 400)
  }
  if (msg.includes('sorteo no encontrado')) {
    throw new SorteoError('Sorteo no encontrado', 404)
  }
  if (msg.includes('sorteo ya tiene ganador')) {
    throw new SorteoError('El sorteo ya tiene ganador', 409)
  }
  if (msg.includes('sorteo no esta abierto')) {
    throw new SorteoError('Este sorteo ya no acepta participaciones', 409)
  }
  if (msg.includes('sorteo no encontrado o ya no esta abierto')) {
    throw new SorteoError('El sorteo no se puede cerrar', 409)
  }
  if (msg.includes('el miembro no participo')) {
    throw new SorteoError('Ese miembro no participó en este sorteo', 400)
  }
  if (msg.includes('no hay participaciones')) {
    throw new SorteoError('Este sorteo no tiene participantes', 400)
  }
  if (msg.includes('ya participaste')) {
    throw new SorteoError('Ya participaste en este sorteo', 409)
  }
  throw error
}

export async function listSorteosAdmin(tenantId: string): Promise<SorteoConMeta[]> {
  const { data, error } = await supabaseAdmin.rpc('list_sorteos_admin', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as SorteoConMeta[]
}

export async function listSorteosActivos(tenantId: string): Promise<Sorteo[]> {
  const { data, error } = await supabaseAdmin.rpc('list_sorteos_activos', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as Sorteo[]
}

export async function getSorteo(
  tenantId: string,
  id: string
): Promise<SorteoConMeta | null> {
  const { data, error } = await supabaseAdmin.rpc('get_sorteo', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) throw error
  const rows = (data ?? []) as SorteoConMeta[]
  return rows[0] ?? null
}

export async function listParticipaciones(
  tenantId: string,
  sorteoId: string
): Promise<SorteoParticipacionAdmin[]> {
  const { data, error } = await supabaseAdmin.rpc('list_participaciones', {
    p_tenant_id: tenantId,
    p_sorteo_id: sorteoId,
  })
  if (error) throw error
  return (data ?? []) as SorteoParticipacionAdmin[]
}

export interface CreateSorteoInput {
  titulo: string
  descripcion?: string | null
  requisitos?: string | null
  imagenUrl?: string | null
  cierraAt?: string | null
}

export async function createSorteo(
  tenantId: string,
  input: CreateSorteoInput
): Promise<Sorteo> {
  const { data, error } = await supabaseAdmin.rpc('create_sorteo', {
    p_tenant_id: tenantId,
    p_titulo: input.titulo,
    p_descripcion: input.descripcion ?? null,
    p_requisitos: input.requisitos ?? null,
    p_imagen_url: input.imagenUrl ?? null,
    p_cierra_at: input.cierraAt ?? null,
  })
  if (error) handleRpcError(error)
  return data as Sorteo
}

export async function closeSorteo(tenantId: string, id: string): Promise<Sorteo> {
  const { data, error } = await supabaseAdmin.rpc('close_sorteo', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) handleRpcError(error)
  return data as Sorteo
}

export async function pickSorteoWinner(
  tenantId: string,
  id: string,
  miembroId: string | null
): Promise<Sorteo> {
  const { data, error } = await supabaseAdmin.rpc('pick_sorteo_winner', {
    p_tenant_id: tenantId,
    p_id: id,
    p_miembro_id: miembroId,
  })
  if (error) handleRpcError(error)
  return data as Sorteo
}

export interface DeletedSorteoFiles {
  imagenUrl: string | null
  evidencias: string[]
}

export async function deleteSorteo(
  tenantId: string,
  id: string
): Promise<DeletedSorteoFiles> {
  const { data, error } = await supabaseAdmin.rpc('delete_sorteo', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) handleRpcError(error)
  const row = (data ?? [])[0] as
    | { imagen_url: string | null; evidencias: string[] }
    | undefined
  return {
    imagenUrl: row?.imagen_url ?? null,
    evidencias: row?.evidencias ?? [],
  }
}

export async function deleteSorteoFiles({
  imagenUrl,
  evidencias,
}: DeletedSorteoFiles): Promise<void> {
  const paths: string[] = []
  if (imagenUrl) {
    const p = sorteoPathFromPublicUrl(imagenUrl)
    if (p) paths.push(p)
  }
  for (const url of evidencias) {
    const p = sorteoPathFromPublicUrl(url)
    if (p) paths.push(p)
  }
  if (paths.length === 0) return
  await supabaseAdmin.storage.from(SORTEOS_BUCKET).remove(paths).catch(() => {})
}

export async function deleteSorteoImageFromStorage(url: string): Promise<void> {
  const path = sorteoPathFromPublicUrl(url)
  if (!path) return
  await supabaseAdmin.storage.from(SORTEOS_BUCKET).remove([path]).catch(() => {})
}

export interface ParticiparInput {
  evidenciaUrl?: string | null
  comentario?: string | null
}

export async function participarSorteo(
  tenantId: string,
  sorteoId: string,
  miembroId: string,
  input: ParticiparInput
): Promise<SorteoParticipacion> {
  const { data, error } = await supabaseAdmin.rpc('participar_sorteo', {
    p_tenant_id: tenantId,
    p_sorteo_id: sorteoId,
    p_miembro_id: miembroId,
    p_evidencia_url: input.evidenciaUrl ?? null,
    p_comentario: input.comentario ?? null,
  })
  if (error) handleRpcError(error)
  return data as SorteoParticipacion
}

export async function getMiParticipacion(
  tenantId: string,
  sorteoId: string,
  miembroId: string
): Promise<SorteoParticipacion | null> {
  const { data, error } = await supabaseAdmin.rpc('get_mi_participacion', {
    p_tenant_id: tenantId,
    p_sorteo_id: sorteoId,
    p_miembro_id: miembroId,
  })
  if (error) throw error
  const rows = (data ?? []) as SorteoParticipacion[]
  return rows[0] ?? null
}
