import { NextRequest, NextResponse } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { esImagenValida } from '@/lib/imagen'
import { setMiembroAvatar } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'business_media'
const MAX_BYTES = 2 * 1024 * 1024
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// Prefijo por miembro dentro del bucket — aísla las fotos por tenant y miembro.
function avatarPrefix(tenantId: string, miembroId: string): string {
  return `tenants/${tenantId}/miembros/${miembroId}/`
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

async function deleteAllAvatarsFor(tenantId: string, miembroId: string): Promise<void> {
  const prefix = avatarPrefix(tenantId, miembroId)
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(prefix)
  if (error || !data) return
  const paths = data.map((f) => prefix + f.name)
  if (paths.length === 0) return
  await supabaseAdmin.storage.from(BUCKET).remove(paths)
}

// El cliente sube su propia foto de perfil desde la PWA. Identidad y tenant
// vienen de la sesión (requireClienteContext) — nunca del body.
export async function POST(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Body inválido (esperado multipart)' },
      { status: 400 }
    )
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo faltante' }, { status: 400 })
  }
  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Formato no soportado (usa PNG, JPG o WebP)' },
      { status: 400 }
    )
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Archivo demasiado grande (máximo 2 MB)' },
      { status: 413 }
    )
  }

  await deleteAllAvatarsFor(auth.tenant.id, auth.miembro.id)

  const path = `${avatarPrefix(auth.tenant.id, auth.miembro.id)}avatar-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!esImagenValida(buffer, file.type)) {
    return NextResponse.json(
      { error: 'El archivo no es una imagen válida' },
      { status: 400 }
    )
  }

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600',
    })
  if (upErr) {
    console.error('upload avatar', upErr)
    return NextResponse.json({ error: 'No se pudo subir la foto' }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  try {
    const miembro = await setMiembroAvatar(auth.tenant.id, auth.miembro.id, pub.publicUrl)
    return NextResponse.json({ miembro })
  } catch (err) {
    // Update falló: borramos el archivo huérfano.
    await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {})
    console.error('set avatar url', err)
    return NextResponse.json({ error: 'No se pudo guardar la foto' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  if (auth.miembro.avatar_url) {
    const path = pathFromPublicUrl(auth.miembro.avatar_url)
    if (path) await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {})
  }
  await deleteAllAvatarsFor(auth.tenant.id, auth.miembro.id)

  try {
    const miembro = await setMiembroAvatar(auth.tenant.id, auth.miembro.id, null)
    return NextResponse.json({ miembro })
  } catch (err) {
    console.error('clear avatar url', err)
    return NextResponse.json({ error: 'No se pudo quitar la foto' }, { status: 500 })
  }
}
