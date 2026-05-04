import { supabaseAdmin } from '@/lib/supabase-admin'
import type { FeedPost } from '@/types'

export const FEED_BUCKET = 'business_media'
export const FEED_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
export const FEED_MAX_BYTES = 4 * 1024 * 1024

export function feedPrefix(tenantId: string): string {
  return `tenants/${tenantId}/feed/`
}

export function feedPathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${FEED_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

export async function listFeedPosts(
  tenantId: string,
  limit = 50
): Promise<FeedPost[]> {
  const { data, error } = await supabaseAdmin.rpc('list_feed_posts', {
    p_tenant_id: tenantId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as FeedPost[]
}

export class FeedPostError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'FeedPostError'
  }
}

export interface CreateFeedPostInput {
  titulo: string
  cuerpo: string
  imagenUrl?: string | null
  linkUrl?: string | null
  linkLabel?: string | null
  autorEmail?: string | null
}

export async function createFeedPost(
  tenantId: string,
  input: CreateFeedPostInput
): Promise<FeedPost> {
  const { data, error } = await supabaseAdmin.rpc('create_feed_post', {
    p_tenant_id: tenantId,
    p_titulo: input.titulo,
    p_cuerpo: input.cuerpo,
    p_imagen_url: input.imagenUrl ?? null,
    p_link_url: input.linkUrl ?? null,
    p_link_label: input.linkLabel ?? null,
    p_autor_email: input.autorEmail ?? null,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('titulo no puede estar vacio')) {
      throw new FeedPostError('El título no puede estar vacío', 400)
    }
    if (msg.includes('cuerpo no puede estar vacio')) {
      throw new FeedPostError('El cuerpo no puede estar vacío', 400)
    }
    throw error
  }
  return data as FeedPost
}

// Devuelve la imagen_url del post borrado (si tenía) para que el caller
// pueda limpiar el archivo en Storage.
export async function deleteFeedPost(
  tenantId: string,
  id: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('delete_feed_post', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) {
    if ((error.message || '').includes('post no encontrado')) {
      throw new FeedPostError('Post no encontrado', 404)
    }
    throw error
  }
  return (data as string | null) ?? null
}

export async function deleteFeedImageFromStorage(url: string): Promise<void> {
  const path = feedPathFromPublicUrl(url)
  if (!path) return
  await supabaseAdmin.storage.from(FEED_BUCKET).remove([path]).catch(() => {})
}
