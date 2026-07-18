import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  listRetosAdmin,
  createReto,
  RetoError,
  RETOS_BUCKET,
  RETO_MIME_TO_EXT,
  RETO_MAX_BYTES,
  retoCoverPrefix,
} from '@/lib/retos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  const retos = await listRetosAdmin(auth.tenantId)
  return NextResponse.json({ retos })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.retos_enabled) {
    return NextResponse.json({ error: 'Retos no habilitados' }, { status: 403 })
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
  const puntosRaw = (form.get('puntos') ?? '0').toString().trim()
  const cierraRaw = (form.get('cierra_at') ?? '').toString().trim()

  if (titulo.length === 0) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }
  if (titulo.length > 120) {
    return NextResponse.json({ error: 'Título máximo 120 caracteres' }, { status: 400 })
  }
  if (descripcion && descripcion.length > 2000) {
    return NextResponse.json({ error: 'Descripción máximo 2000 caracteres' }, { status: 400 })
  }
  if (requisitos && requisitos.length > 500) {
    return NextResponse.json({ error: 'Requisitos máximo 500 caracteres' }, { status: 400 })
  }
  const puntos = Number(puntosRaw)
  if (!Number.isInteger(puntos) || puntos < 0 || puntos > 100000) {
    return NextResponse.json(
      { error: 'Puntos debe ser entero entre 0 y 100000' },
      { status: 400 }
    )
  }
  let cierraAt: string | null = null
  if (cierraRaw) {
    const d = new Date(cierraRaw)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Fecha de cierre inválida' }, { status: 400 })
    }
    cierraAt = d.toISOString()
  }

  let imagenUrl: string | null = null
  const file = form.get('file')
  if (file instanceof File && file.size > 0) {
    const ext = RETO_MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json({ error: 'Imagen: usa PNG, JPG o WebP' }, { status: 400 })
    }
    if (file.size > RETO_MAX_BYTES) {
      return NextResponse.json({ error: 'Imagen demasiado grande (máximo 5 MB)' }, { status: 413 })
    }
    const path = `${retoCoverPrefix(auth.tenantId)}cover-${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabaseAdmin.storage
      .from(RETOS_BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: false, cacheControl: '3600' })
    if (upErr) {
      console.error('upload reto cover', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }
    const { data: pub } = supabaseAdmin.storage.from(RETOS_BUCKET).getPublicUrl(path)
    imagenUrl = pub.publicUrl
  }

  try {
    const reto = await createReto(auth.tenantId, {
      titulo,
      descripcion,
      requisitos,
      imagenUrl,
      puntos,
      cierraAt,
    })
    return NextResponse.json({ reto }, { status: 201 })
  } catch (err) {
    if (err instanceof RetoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/retos', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
