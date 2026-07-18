import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { esImagenValida } from '@/lib/imagen'
import { getTenantFeatures, updateTenantFeatures } from '@/lib/tenant-features'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'business_media'
const MAX_BYTES = 1 * 1024 * 1024
// La estampilla debe ser PNG (idealmente con transparencia) para que la
// silueta/máscara funcione bien.
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
}

function selloPrefix(tenantId: string): string {
  return `tenants/${tenantId}/tarjeta/`
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

async function deleteAllSellosFor(tenantId: string): Promise<void> {
  const prefix = selloPrefix(tenantId)
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(prefix)
  if (error || !data) return
  const paths = data.map((f) => prefix + f.name)
  if (paths.length === 0) return
  await supabaseAdmin.storage.from(BUCKET).remove(paths)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
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
      { error: 'Usa PNG o WebP (idealmente con fondo transparente)' },
      { status: 400 }
    )
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Archivo demasiado grande (máximo 1 MB)' },
      { status: 413 }
    )
  }

  await deleteAllSellosFor(auth.tenantId)

  const path = `${selloPrefix(auth.tenantId)}sello-${Date.now()}.${ext}`
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
    console.error('upload sello', upErr)
    return NextResponse.json({ error: 'No se pudo subir la estampilla' }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  try {
    const features = await updateTenantFeatures(auth.tenantId, {
      tarjeta_sello_url: pub.publicUrl,
    })
    return NextResponse.json({ features })
  } catch (err) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {})
    console.error('save sello url', err)
    return NextResponse.json({ error: 'No se pudo guardar la estampilla' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (features.tarjeta_sello_url) {
    const path = pathFromPublicUrl(features.tarjeta_sello_url)
    if (path) await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {})
  }
  await deleteAllSellosFor(auth.tenantId)

  try {
    const updated = await updateTenantFeatures(auth.tenantId, {
      tarjeta_sello_url: null,
    })
    return NextResponse.json({ features: updated })
  } catch (err) {
    console.error('clear sello url', err)
    return NextResponse.json({ error: 'No se pudo quitar la estampilla' }, { status: 500 })
  }
}
