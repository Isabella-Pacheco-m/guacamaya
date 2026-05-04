import { NextResponse } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  participarSorteo,
  SorteoError,
  SORTEOS_BUCKET,
  SORTEO_MIME_TO_EXT,
  SORTEO_MAX_BYTES,
  sorteoEvidenciaPrefix,
} from '@/lib/sorteos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireClienteContext()
  if (!auth.ok) return auth.res
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const features = await getTenantFeatures(auth.tenant.id)
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

  const comentario = (form.get('comentario') ?? '').toString().trim() || null
  if (comentario && comentario.length > 500) {
    return NextResponse.json(
      { error: 'comentario máximo 500 caracteres' },
      { status: 400 }
    )
  }

  let evidenciaUrl: string | null = null
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
    const path = `${sorteoEvidenciaPrefix(auth.tenant.id, params.id)}${auth.miembro.id}-${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabaseAdmin.storage
      .from(SORTEOS_BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      })
    if (upErr) {
      console.error('upload sorteo evidencia', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }
    const { data: pub } = supabaseAdmin.storage
      .from(SORTEOS_BUCKET)
      .getPublicUrl(path)
    evidenciaUrl = pub.publicUrl
  }

  try {
    const participacion = await participarSorteo(
      auth.tenant.id,
      params.id,
      auth.miembro.id,
      { evidenciaUrl, comentario }
    )
    return NextResponse.json({ participacion }, { status: 201 })
  } catch (err) {
    if (err instanceof SorteoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
