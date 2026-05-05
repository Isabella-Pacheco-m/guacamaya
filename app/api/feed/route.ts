import { NextResponse, type NextRequest} from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { requireAdminTenantId } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  listFeedPosts,
  createFeedPost,
  FeedPostError,
  FEED_BUCKET,
  FEED_MAX_BYTES,
  FEED_MIME_TO_EXT,
  feedPrefix,
} from '@/lib/feed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  const posts = await listFeedPosts(auth.tenantId)
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.feed_enabled) {
    return NextResponse.json({ error: 'Feed no habilitado' }, { status: 403 })
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
  const cuerpo = (form.get('cuerpo') ?? '').toString().trim()
  const linkUrl = ((form.get('link_url') ?? '').toString().trim() || null) as
    | string
    | null
  const linkLabel = ((form.get('link_label') ?? '').toString().trim() || null) as
    | string
    | null

  if (titulo.length === 0) {
    return NextResponse.json({ error: 'titulo es requerido' }, { status: 400 })
  }
  if (titulo.length > 120) {
    return NextResponse.json(
      { error: 'titulo máximo 120 caracteres' },
      { status: 400 }
    )
  }
  if (cuerpo.length === 0) {
    return NextResponse.json({ error: 'cuerpo es requerido' }, { status: 400 })
  }
  if (cuerpo.length > 2000) {
    return NextResponse.json(
      { error: 'cuerpo máximo 2000 caracteres' },
      { status: 400 }
    )
  }
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
    return NextResponse.json(
      { error: 'link_url debe empezar con http(s)://' },
      { status: 400 }
    )
  }
  if (linkLabel && linkLabel.length > 60) {
    return NextResponse.json(
      { error: 'link_label máximo 60 caracteres' },
      { status: 400 }
    )
  }

  // Imagen opcional
  let imagenUrl: string | null = null
  const file = form.get('file')
  if (file instanceof File && file.size > 0) {
    const ext = FEED_MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Imagen: usa PNG, JPG o WebP' },
        { status: 400 }
      )
    }
    if (file.size > FEED_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Imagen demasiado grande (máximo 4 MB)' },
        { status: 413 }
      )
    }
    const path = `${feedPrefix(auth.tenantId)}post-${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabaseAdmin.storage
      .from(FEED_BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      })
    if (upErr) {
      console.error('upload feed image', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }
    const { data: pub } = supabaseAdmin.storage.from(FEED_BUCKET).getPublicUrl(path)
    imagenUrl = pub.publicUrl
  }

  const session = await getSession(req, new NextResponse())
  const autorEmail = (session?.user?.email as string | undefined) ?? null

  try {
    const post = await createFeedPost(auth.tenantId, {
      titulo,
      cuerpo,
      imagenUrl,
      linkUrl,
      linkLabel,
      autorEmail,
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    if (err instanceof FeedPostError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
