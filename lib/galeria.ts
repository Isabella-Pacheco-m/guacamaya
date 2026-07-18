// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Miembro } from '@/types'

// NOTA: los tipos de este módulo se pueden importar con `import type` desde
// componentes cliente sin arrastrar supabase-admin al bundle. No importar
// VALORES de aquí en 'use client'.

export const GALERIA_BUCKET = 'business_media'
export const GALERIA_MAX_BYTES = 5 * 1024 * 1024
export const GALERIA_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type GaleriaEstado = 'pendiente' | 'aprobado' | 'rechazado'

export interface GaleriaPost {
  id: string
  tenant_id: string
  miembro_id: string
  imagen_url: string
  caption: string | null
  estado: GaleriaEstado
  puntos_otorgados: number
  created_at: string
  revisado_at: string | null
}

// Fila pública (galería aprobada) con datos del autor.
export interface GaleriaPostPublic {
  id: string
  miembro_id: string
  imagen_url: string
  caption: string | null
  created_at: string
  miembro_nombre: string
  miembro_avatar_url: string | null
}

// Fila para la cola de moderación del admin.
export interface GaleriaPostAdmin {
  id: string
  miembro_id: string
  imagen_url: string
  caption: string | null
  estado: GaleriaEstado
  puntos_otorgados: number
  created_at: string
  revisado_at: string | null
  miembro_nombre: string
  miembro_telefono: string | null
}

export class GaleriaError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'GaleriaError'
  }
}

export function galeriaPrefix(tenantId: string, miembroId: string): string {
  return `tenants/${tenantId}/galeria/${miembroId}/`
}

export function galeriaPathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${GALERIA_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

export async function uploadGaleriaImage(
  tenantId: string,
  miembroId: string,
  file: File
): Promise<string> {
  const ext = GALERIA_MIME_TO_EXT[file.type]
  if (!ext) throw new GaleriaError('Imagen: usa PNG, JPG o WebP', 400)
  if (file.size === 0) throw new GaleriaError('Archivo vacío', 400)
  if (file.size > GALERIA_MAX_BYTES)
    throw new GaleriaError('Imagen demasiado grande (máximo 5 MB)', 413)
  const path = `${galeriaPrefix(tenantId, miembroId)}${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage
    .from(GALERIA_BUCKET)
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600',
    })
  if (error) {
    console.error('upload galeria', error)
    throw new GaleriaError('No se pudo subir la imagen', 500)
  }
  const { data: pub } = supabaseAdmin.storage
    .from(GALERIA_BUCKET)
    .getPublicUrl(path)
  return pub.publicUrl
}

export async function createGaleriaPost(
  tenantId: string,
  miembroId: string,
  imagenUrl: string,
  caption: string | null
): Promise<GaleriaPost> {
  const { data, error } = await supabaseAdmin.rpc('create_galeria_post', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_imagen_url: imagenUrl,
    p_caption: caption,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('imagen requerida')) throw new GaleriaError('Imagen requerida', 400)
    if (msg.includes('miembro no encontrado')) throw new GaleriaError('Miembro no encontrado', 404)
    if (msg.includes('demasiadas fotos pendientes'))
      throw new GaleriaError('Tienes muchas fotos en revisión. Espera a que las aprueben.', 429)
    throw error
  }
  return data as GaleriaPost
}

// Tamaño de página del scroll infinito de la galería.
export const GALERIA_PAGE_SIZE = 24

// Paginación por keyset: `before` es el created_at del último elemento ya
// mostrado. Estable aunque entren fotos nuevas durante el scroll.
export async function listGaleriaAprobadas(
  tenantId: string,
  limit = GALERIA_PAGE_SIZE,
  before?: string | null
): Promise<GaleriaPostPublic[]> {
  const { data, error } = await supabaseAdmin.rpc('list_galeria_aprobadas', {
    p_tenant_id: tenantId,
    p_limit: limit,
    p_before: before ?? null,
  })
  if (error) throw error
  return (data ?? []) as GaleriaPostPublic[]
}

export async function listGaleriaMiembro(
  tenantId: string,
  miembroId: string,
  limit = 40
): Promise<GaleriaPost[]> {
  const { data, error } = await supabaseAdmin.rpc('list_galeria_miembro', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as GaleriaPost[]
}

export async function listGaleriaAdmin(
  tenantId: string,
  estado: GaleriaEstado | null,
  limit = 100
): Promise<GaleriaPostAdmin[]> {
  const { data, error } = await supabaseAdmin.rpc('list_galeria_admin', {
    p_tenant_id: tenantId,
    p_estado: estado,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as GaleriaPostAdmin[]
}

export async function aprobarGaleriaPost(
  tenantId: string,
  id: string,
  puntos: number
): Promise<{ post: GaleriaPost; miembro: Miembro }> {
  const { data, error } = await supabaseAdmin.rpc('aprobar_galeria_post', {
    p_tenant_id: tenantId,
    p_id: id,
    p_puntos: puntos,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('foto no encontrada')) throw new GaleriaError('Foto no encontrada', 404)
    if (msg.includes('foto ya revisada')) throw new GaleriaError('Esta foto ya fue revisada', 409)
    throw error
  }
  return data as { post: GaleriaPost; miembro: Miembro }
}

export async function rechazarGaleriaPost(
  tenantId: string,
  id: string
): Promise<GaleriaPost> {
  const { data, error } = await supabaseAdmin.rpc('rechazar_galeria_post', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('foto no encontrada')) throw new GaleriaError('Foto no encontrada', 404)
    if (msg.includes('foto ya revisada')) throw new GaleriaError('Esta foto ya fue revisada', 409)
    throw error
  }
  return data as GaleriaPost
}
