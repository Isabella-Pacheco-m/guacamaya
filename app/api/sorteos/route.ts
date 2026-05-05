import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  listSorteosAdmin,
  createSorteo,
  SorteoError,
  SORTEOS_BUCKET,
  SORTEO_MIME_TO_EXT,
  SORTEO_MAX_BYTES,
  sorteoCoverPrefix,
} from '@/lib/sorteos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  const sorteos = await listSorteosAdmin(auth.tenantId)
  return NextResponse.json({ sorteos })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.sorteos_enabled) {
    return NextResponse.json({ error: 'Sorteos no habilitados' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Body inválido (esperado multipart)' },
      { status: 400 }
    )
  }

  const titulo = (form.get('titulo') ?? '').toString().trim()
  const descripcion = (form.get('descripcion') ?? '').toString().trim() || null
  const requisitos = (form.get('requisitos') ?? '').toString().trim() || null
  const cierraAtRaw = (form.get('cierra_at') ?? '').toString().trim()
  let cierraAt: string | null = null
  if (cierraAtRaw) {
    const d = new Date(cierraAtRaw)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'cierra_at inválido' }, { status: 400 })
    }
    cierraAt = d.toISOString()
  }

  if (titulo.length === 0) {
    return NextResponse.json({ error: 'titulo es requerido' }, { status: 400 })
  }
  if (titulo.length > 120) {
    return NextResponse.json({ error: 'titulo máximo 120 caracteres' }, { status: 400 })
  }
  if (descripcion && descripcion.length > 2000) {
    return NextResponse.json(
      { error: 'descripcion máximo 2000 caracteres' },
      { status: 400 }
    )
  }
  if (requisitos && requisitos.length > 500) {
    return NextResponse.json(
      { error: 'requisitos máximo 500 caracteres' },
      { status: 400 }
    )
  }

  let imagenUrl: string | null = null
  const file = form.get('file')
  if (file instanceof File && file.size > 0) {
    const ext = SORTEO_MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Imagen: usa PNG, JPG o WebP' },
        { status: 400 }
      )
    }
    if (file.size > SORTEO_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Imagen demasiado grande (máximo 4 MB)' },
        { status: 413 }
      )
    }
    const path = `${sorteoCoverPrefix(auth.tenantId)}cover-${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabaseAdmin.storage
      .from(SORTEOS_BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      })
    if (upErr) {
      console.error('upload sorteo cover', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }
    const { data: pub } = supabaseAdmin.storage
      .from(SORTEOS_BUCKET)
      .getPublicUrl(path)
    imagenUrl = pub.publicUrl
  }

  try {
    const sorteo = await createSorteo(auth.tenantId, {
      titulo,
      descripcion,
      requisitos,
      imagenUrl,
      cierraAt,
    })
    return NextResponse.json({ sorteo }, { status: 201 })
  } catch (err) {
    if (err instanceof SorteoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
