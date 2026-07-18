import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  listLanzamientosAdmin,
  createLanzamiento,
  uploadLanzamientoBanner,
  LanzamientoError,
  type LanzamientoEstado,
} from '@/lib/lanzamientos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  const lanzamientos = await listLanzamientosAdmin(auth.tenantId)
  return NextResponse.json({ lanzamientos })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.lanzamientos_enabled) {
    return NextResponse.json({ error: 'Lanzamientos no habilitados' }, { status: 403 })
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
  const teaser = (form.get('teaser') ?? '').toString().trim() || null
  const descripcion = (form.get('descripcion') ?? '').toString().trim() || null
  const ctaUrl = (form.get('cta_url') ?? '').toString().trim() || null
  const ctaLabel = (form.get('cta_label') ?? '').toString().trim() || null
  const estadoRaw = (form.get('estado') ?? 'teaser').toString().trim()
  const revelaRaw = (form.get('revela_at') ?? '').toString().trim()

  if (titulo.length === 0) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }
  if (titulo.length > 120) {
    return NextResponse.json({ error: 'Título máximo 120 caracteres' }, { status: 400 })
  }
  if (teaser && teaser.length > 500) {
    return NextResponse.json({ error: 'Teaser máximo 500 caracteres' }, { status: 400 })
  }
  if (descripcion && descripcion.length > 3000) {
    return NextResponse.json(
      { error: 'Descripción máximo 3000 caracteres' },
      { status: 400 }
    )
  }
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
    return NextResponse.json(
      { error: 'El enlace del botón debe empezar con http(s)://' },
      { status: 400 }
    )
  }
  if (ctaLabel && ctaLabel.length > 40) {
    return NextResponse.json(
      { error: 'El texto del botón máximo 40 caracteres' },
      { status: 400 }
    )
  }
  const estado: LanzamientoEstado = estadoRaw === 'activo' ? 'activo' : 'teaser'

  let revelaAt: string | null = null
  if (revelaRaw) {
    const d = new Date(revelaRaw)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Fecha de revelado inválida' }, { status: 400 })
    }
    revelaAt = d.toISOString()
  }

  try {
    let bannerUrl: string | null = null
    const file = form.get('file')
    if (file instanceof File && file.size > 0) {
      bannerUrl = await uploadLanzamientoBanner(auth.tenantId, file)
    }
    const lanzamiento = await createLanzamiento(auth.tenantId, {
      titulo,
      teaser,
      descripcion,
      bannerUrl,
      ctaUrl,
      ctaLabel,
      estado,
      revelaAt,
    })
    return NextResponse.json({ lanzamiento }, { status: 201 })
  } catch (err) {
    if (err instanceof LanzamientoError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/lanzamientos', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
