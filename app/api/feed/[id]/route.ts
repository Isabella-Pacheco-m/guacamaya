import { NextResponse } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  deleteFeedPost,
  deleteFeedImageFromStorage,
  FeedPostError,
} from '@/lib/feed'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminTenantId()
  if (!auth.ok) return auth.res

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  try {
    const imagenUrl = await deleteFeedPost(auth.tenantId, params.id)
    if (imagenUrl) await deleteFeedImageFromStorage(imagenUrl)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof FeedPostError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
