import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireClienteContext } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  participarReto,
  RetoError,
  RETOS_BUCKET,
  RETO_MIME_TO_EXT,
  RETO_MAX_BYTES,
  retoEvidenciaPrefix,
} from '@/lib/retos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const features = await getTenantFeatures(auth.tenant.id)
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

  const comentario = (form.get('comentario') ?? '').toString().trim() || null
  if (comentario && comentario.length > 500) {
    return NextResponse.json({ error: 'comentario máximo 500 caracteres' }, { status: 400 })
  }

  let evidenciaUrl: string | null = null
  const file = form.get('file')
  if (file instanceof File && file.size > 0) {
    const ext = RETO_MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json({ error: 'Imagen: usa PNG, JPG o WebP' }, { status: 400 })
    }
    if (file.size > RETO_MAX_BYTES) {
      return NextResponse.json({ error: 'Imagen demasiado grande (máximo 5 MB)' }, { status: 413 })
    }
    // Nombre con UUID aleatorio: la evidencia (facturas) vive en un bucket
    // público y con miembroId+timestamp la URL era semi-adivinable.
    const path = `${retoEvidenciaPrefix(auth.tenant.id, params.id)}${auth.miembro.id}-${randomUUID()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabaseAdmin.storage
      .from(RETOS_BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: false, cacheControl: '3600' })
    if (upErr) {
      console.error('upload reto evidencia', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }
    const { data: pub } = supabaseAdmin.storage.from(RETOS_BUCKET).getPublicUrl(path)
    evidenciaUrl = pub.publicUrl
  }

  try {
    const participacion = await participarReto(
      auth.tenant.id,
      params.id,
      auth.miembro.id,
      { evidenciaUrl, comentario }
    )
    return NextResponse.json({ participacion }, { status: 201 })
  } catch (err) {
    if (err instanceof RetoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/me/retos/[id]/participar', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
