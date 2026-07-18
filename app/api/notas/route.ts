import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listNotas, createNota, NotaError } from '@/lib/tenantQueries'
import { NOTA_COLORS, type NotaColor } from '@/lib/notas'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  const notas = await listNotas(auth.tenantId)
  return NextResponse.json({ notas })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.notas_enabled) {
    return NextResponse.json({ error: 'Notas no habilitadas' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { cuerpo, color, pinned } = (body ?? {}) as {
    cuerpo?: unknown
    color?: unknown
    pinned?: unknown
  }

  if (typeof cuerpo !== 'string' || cuerpo.trim().length === 0) {
    return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 })
  }
  if (cuerpo.length > 500) {
    return NextResponse.json(
      { error: 'El mensaje no puede superar 500 caracteres' },
      { status: 400 }
    )
  }
  let colorFinal: NotaColor = 'amarillo'
  if (color !== undefined) {
    if (typeof color !== 'string' || !NOTA_COLORS.includes(color as NotaColor)) {
      return NextResponse.json(
        { error: `color debe ser uno de: ${NOTA_COLORS.join(', ')}` },
        { status: 400 }
      )
    }
    colorFinal = color as NotaColor
  }
  if (pinned !== undefined && typeof pinned !== 'boolean') {
    return NextResponse.json({ error: 'pinned debe ser boolean' }, { status: 400 })
  }

  try {
    const nota = await createNota(
      auth.tenantId,
      cuerpo.trim(),
      colorFinal,
      pinned === true
    )
    return NextResponse.json({ nota }, { status: 201 })
  } catch (err) {
    if (err instanceof NotaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('POST /api/notas', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
