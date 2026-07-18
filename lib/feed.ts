// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { FeedPost, FeedPostPublic } from '@/types'

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

/**
 * Posts para la PWA del cliente: igual que listFeedPosts pero SIN
 * `autor_email`. El correo del admin solo debe llegar al panel admin; todo
 * lo que se pase a un componente cliente termina serializado en el payload
 * de la página, se pinte o no.
 */
export async function listFeedPostsPublic(
  tenantId: string,
  limit = 50
): Promise<FeedPostPublic[]> {
  const posts = await listFeedPosts(tenantId, limit)
  return posts.map(({ autor_email: _omit, ...pub }) => pub)
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

// Sube una imagen de post al bucket del tenant y devuelve su URL pública.
// Valida tipo y tamaño; lanza FeedPostError. Compartido por el alta del admin
// y la del miembro.
export async function uploadFeedImage(
  tenantId: string,
  file: File
): Promise<string> {
  const ext = FEED_MIME_TO_EXT[file.type]
  if (!ext) {
    throw new FeedPostError('Imagen: usa PNG, JPG o WebP', 400)
  }
  if (file.size > FEED_MAX_BYTES) {
    throw new FeedPostError('Imagen demasiado grande (máximo 4 MB)', 413)
  }
  const path = `${feedPrefix(tenantId)}post-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage
    .from(FEED_BUCKET)
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600',
    })
  if (error) {
    console.error('upload feed image', error)
    throw new FeedPostError(error.message, 500)
  }
  const { data: pub } = supabaseAdmin.storage.from(FEED_BUCKET).getPublicUrl(path)
  return pub.publicUrl
}

export interface CreateFeedPostMiembroInput {
  miembroId: string
  nombre: string
  cuerpo: string
  imagenUrl?: string | null
}

// Alta de post hecha por un miembro (sin título ni link). El RPC valida que
// el miembro pertenezca al tenant.
export async function createFeedPostMiembro(
  tenantId: string,
  input: CreateFeedPostMiembroInput
): Promise<FeedPost> {
  const { data, error } = await supabaseAdmin.rpc('create_feed_post_miembro', {
    p_tenant_id: tenantId,
    p_miembro_id: input.miembroId,
    p_nombre: input.nombre,
    p_cuerpo: input.cuerpo,
    p_imagen_url: input.imagenUrl ?? null,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('cuerpo no puede estar vacio')) {
      throw new FeedPostError('El mensaje no puede estar vacío', 400)
    }
    if (msg.includes('miembro no encontrado')) {
      throw new FeedPostError('Miembro no encontrado', 404)
    }
    throw error
  }
  return data as FeedPost
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
