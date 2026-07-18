import { NextRequest, NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { esImagenValida } from '@/lib/imagen'
import { getTenantById } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'business_media'
const MAX_BYTES = 4 * 1024 * 1024
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function bannerPrefix(tenantId: string): string {
  return `tenants/${tenantId}/banner/`
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}

async function deleteAllBannersFor(tenantId: string): Promise<void> {
  const prefix = bannerPrefix(tenantId)
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
      { error: 'Formato no soportado (usa PNG, JPG o WebP)' },
      { status: 400 }
    )
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Archivo demasiado grande (máximo 4 MB)' },
      { status: 413 }
    )
  }

  await deleteAllBannersFor(auth.tenantId)

  const path = `${bannerPrefix(auth.tenantId)}banner-${Date.now()}.${ext}`
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
    console.error('upload banner', upErr)
    return NextResponse.json({ error: 'No se pudo subir el banner' }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  const { data: tenant, error: dbErr } = await supabaseAdmin
    .from('tenants')
    .update({ banner_url: pub.publicUrl })
    .eq('id', auth.tenantId)
    .select(
      'id, nombre, slug, logo_url, banner_url, color_primario, puntos_por_mil, puntos_cumpleanos'
    )
    .single()
  if (dbErr) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {})
    console.error('update tenant.banner_url', dbErr)
    return NextResponse.json({ error: 'No se pudo guardar el banner' }, { status: 500 })
  }

  return NextResponse.json({ tenant })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const tenant = await getTenantById(auth.tenantId)
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
  }

  if (tenant.banner_url) {
    const path = pathFromPublicUrl(tenant.banner_url)
    if (path) await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {})
  }
  await deleteAllBannersFor(auth.tenantId)

  const { data: updated, error } = await supabaseAdmin
    .from('tenants')
    .update({ banner_url: null })
    .eq('id', auth.tenantId)
    .select(
      'id, nombre, slug, logo_url, banner_url, color_primario, puntos_por_mil, puntos_cumpleanos'
    )
    .single()
  if (error) {
    console.error('clear tenant.banner_url', error)
    return NextResponse.json({ error: 'No se pudo eliminar el banner' }, { status: 500 })
  }

  return NextResponse.json({ tenant: updated })
}
