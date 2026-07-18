import { NextResponse, type NextRequest } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  uploadGaleriaImage,
  createGaleriaPost,
  GaleriaError,
} from '@/lib/galeria'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// El miembro sube una foto a la galería (queda pendiente de aprobación).
export async function POST(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenant.id)
  if (!features.galeria_enabled) {
    return NextResponse.json({ error: 'Galería no habilitada' }, { status: 403 })
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

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'La foto es requerida' }, { status: 400 })
  }
  const caption = (form.get('caption') ?? '').toString().trim() || null
  if (caption && caption.length > 300) {
    return NextResponse.json(
      { error: 'El texto no puede superar 300 caracteres' },
      { status: 400 }
    )
  }

  try {
    const imagenUrl = await uploadGaleriaImage(auth.tenant.id, auth.miembro.id, file)
    const post = await createGaleriaPost(
      auth.tenant.id,
      auth.miembro.id,
      imagenUrl,
      caption
    )
    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    if (err instanceof GaleriaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/me/galeria', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
