import { NextResponse } from 'next/server'
import { getTenantFromRequest, TenantNotFoundError } from '@/lib/tenant'
import { listRecompensasActivas } from '@/lib/tenantQueries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tenant = await getTenantFromRequest()
    const recompensas = await listRecompensasActivas(tenant.id)
    return NextResponse.json({ recompensas })
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('GET /api/public/recompensas', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
