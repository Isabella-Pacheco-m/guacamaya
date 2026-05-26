import { NextResponse, type NextRequest } from 'next/server'
import { requireClienteContext } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  createFeedPostMiembro,
  uploadFeedImage,
  FeedPostError,
} from '@/lib/feed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Publicación hecha por un miembro desde la PWA. Solo texto + imagen opcional
// (sin título ni link). Gated por feed_enabled y por el permiso que el admin
// activa (feed_miembros_pueden_publicar).
export async function POST(req: NextRequest) {
  const auth = await requireClienteContext(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenant.id)
  if (!features.feed_enabled) {
    return NextResponse.json({ error: 'Feed no habilitado' }, { status: 403 })
  }
  if (!features.feed_miembros_pueden_publicar) {
    return NextResponse.json(
      { error: 'Las publicaciones de miembros no están habilitadas' },
      { status: 403 }
    )
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

  const cuerpo = (form.get('cuerpo') ?? '').toString().trim()
  if (cuerpo.length === 0) {
    return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 })
  }
  if (cuerpo.length > 2000) {
    return NextResponse.json(
      { error: 'El mensaje no puede superar 2000 caracteres' },
      { status: 400 }
    )
  }

  try {
    let imagenUrl: string | null = null
    const file = form.get('file')
    if (file instanceof File && file.size > 0) {
      imagenUrl = await uploadFeedImage(auth.tenant.id, file)
    }

    const post = await createFeedPostMiembro(auth.tenant.id, {
      miembroId: auth.miembro.id,
      nombre: auth.miembro.nombre,
      cuerpo,
      imagenUrl,
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    if (err instanceof FeedPostError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
