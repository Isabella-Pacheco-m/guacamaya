import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getTenantById, regenerateJoinCode } from '@/lib/tenant'
import { joinUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

// Genera (o rota) el enlace de invitación a la comunidad. Solo el admin del
// tenant. Rotar invalida los enlaces anteriores.
export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const code = await regenerateJoinCode(auth.tenantId)
  const tenant = await getTenantById(auth.tenantId)
  return NextResponse.json({
    code,
    url: joinUrl(code),
    slug: tenant?.slug ?? null,
  })
}
