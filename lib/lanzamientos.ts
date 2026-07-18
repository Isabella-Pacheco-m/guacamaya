import { supabaseAdmin } from '@/lib/supabase-admin'

// Tipos importables con `import type` desde componentes cliente. No importar
// VALORES de este módulo en 'use client'.

export const LANZAMIENTO_BUCKET = 'business_media'
export const LANZAMIENTO_MAX_BYTES = 4 * 1024 * 1024
export const LANZAMIENTO_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type LanzamientoEstado = 'teaser' | 'activo' | 'finalizado'

export interface Lanzamiento {
  id: string
  tenant_id: string
  titulo: string
  teaser: string | null
  descripcion: string | null
  banner_url: string | null
  cta_url: string | null
  cta_label: string | null
  estado: LanzamientoEstado
  revela_at: string | null
  created_at: string
}

export class LanzamientoError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'LanzamientoError'
  }
}

// ¿Ya se reveló? Activo siempre; teaser cuando su revela_at ya pasó. Lo usan
// tanto el server (render) como el cliente (para pasar de countdown a revelado
// sin recargar). Devuelve false para finalizados.
export function estaRevelado(l: Pick<Lanzamiento, 'estado' | 'revela_at'>): boolean {
  if (l.estado === 'activo') return true
  if (l.estado === 'teaser') {
    if (!l.revela_at) return false
    return new Date(l.revela_at).getTime() <= Date.now()
  }
  return false
}

export function lanzamientoPrefix(tenantId: string): string {
  return `tenants/${tenantId}/lanzamientos/`
}

export function lanzamientoPathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${LANZAMIENTO_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

export async function uploadLanzamientoBanner(
  tenantId: string,
  file: File
): Promise<string> {
  const ext = LANZAMIENTO_MIME_TO_EXT[file.type]
  if (!ext) throw new LanzamientoError('Imagen: usa PNG, JPG o WebP', 400)
  if (file.size === 0) throw new LanzamientoError('Archivo vacío', 400)
  if (file.size > LANZAMIENTO_MAX_BYTES)
    throw new LanzamientoError('Imagen demasiado grande (máximo 4 MB)', 413)
  const path = `${lanzamientoPrefix(tenantId)}${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage
    .from(LANZAMIENTO_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false, cacheControl: '3600' })
  if (error) {
    console.error('upload lanzamiento banner', error)
    throw new LanzamientoError('No se pudo subir el banner', 500)
  }
  const { data: pub } = supabaseAdmin.storage
    .from(LANZAMIENTO_BUCKET)
    .getPublicUrl(path)
  return pub.publicUrl
}

export async function deleteLanzamientoBanner(url: string): Promise<void> {
  const path = lanzamientoPathFromPublicUrl(url)
  if (!path) return
  await supabaseAdmin.storage.from(LANZAMIENTO_BUCKET).remove([path]).catch(() => {})
}

export interface CreateLanzamientoInput {
  titulo: string
  teaser: string | null
  descripcion: string | null
  bannerUrl: string | null
  ctaUrl: string | null
  ctaLabel: string | null
  estado: LanzamientoEstado
  revelaAt: string | null
}

export async function createLanzamiento(
  tenantId: string,
  input: CreateLanzamientoInput
): Promise<Lanzamiento> {
  const { data, error } = await supabaseAdmin.rpc('create_lanzamiento', {
    p_tenant_id: tenantId,
    p_titulo: input.titulo,
    p_teaser: input.teaser,
    p_descripcion: input.descripcion,
    p_banner_url: input.bannerUrl,
    p_cta_url: input.ctaUrl,
    p_cta_label: input.ctaLabel,
    p_estado: input.estado,
    p_revela_at: input.revelaAt,
  })
  if (error) {
    if ((error.message || '').includes('titulo no puede estar vacio')) {
      throw new LanzamientoError('El título es requerido', 400)
    }
    throw error
  }
  return data as Lanzamiento
}

export async function listLanzamientosAdmin(tenantId: string): Promise<Lanzamiento[]> {
  const { data, error } = await supabaseAdmin.rpc('list_lanzamientos_admin', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as Lanzamiento[]
}

export async function listLanzamientosPwa(tenantId: string): Promise<Lanzamiento[]> {
  const { data, error } = await supabaseAdmin.rpc('list_lanzamientos_pwa', {
    p_tenant_id: tenantId,
  })
  if (error) throw error
  return (data ?? []) as Lanzamiento[]
}

export async function setLanzamientoEstado(
  tenantId: string,
  id: string,
  estado: LanzamientoEstado
): Promise<Lanzamiento> {
  const { data, error } = await supabaseAdmin.rpc('set_lanzamiento_estado', {
    p_tenant_id: tenantId,
    p_id: id,
    p_estado: estado,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('lanzamiento no encontrado'))
      throw new LanzamientoError('Lanzamiento no encontrado', 404)
    if (msg.includes('estado invalido'))
      throw new LanzamientoError('Estado inválido', 400)
    throw error
  }
  return data as Lanzamiento
}

export async function deleteLanzamiento(
  tenantId: string,
  id: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('delete_lanzamiento', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) {
    if ((error.message || '').includes('lanzamiento no encontrado'))
      throw new LanzamientoError('Lanzamiento no encontrado', 404)
    throw error
  }
  return (data as string | null) ?? null
}
