import { NextResponse, type NextRequest} from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import {
  FEATURE_KEYS,
  TARJETA_ESTILOS,
  getTenantFeatures,
  updateTenantFeatures,
  TenantFeaturesError,
  type TarjetaEstilo,
  type TenantFeaturesPatch,
} from '@/lib/tenant-features'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res
  const features = await getTenantFeatures(auth.tenantId)
  return NextResponse.json(features)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const raw = body as Record<string, unknown>

  const patch: TenantFeaturesPatch = {}
  for (const k of FEATURE_KEYS) {
    const v = raw[k]
    if (v === undefined) continue
    if (typeof v !== 'boolean') {
      return NextResponse.json(
        { error: `${k} debe ser boolean` },
        { status: 400 }
      )
    }
    patch[k] = v
  }
  if ('feed_miembros_pueden_publicar' in raw) {
    const v = raw.feed_miembros_pueden_publicar
    if (typeof v !== 'boolean') {
      return NextResponse.json(
        { error: 'feed_miembros_pueden_publicar debe ser boolean' },
        { status: 400 }
      )
    }
    patch.feed_miembros_pueden_publicar = v
  }
  if ('registro_abierto' in raw) {
    const v = raw.registro_abierto
    if (typeof v !== 'boolean') {
      return NextResponse.json(
        { error: 'registro_abierto debe ser boolean' },
        { status: 400 }
      )
    }
    patch.registro_abierto = v
  }
  if ('tarjeta_size' in raw) {
    const v = raw.tarjeta_size
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      return NextResponse.json(
        { error: 'tarjeta_size debe ser entero' },
        { status: 400 }
      )
    }
    patch.tarjeta_size = v
  }
  if ('sello_valor_cop' in raw) {
    const v = raw.sello_valor_cop
    if (v === null) {
      patch.sello_valor_cop = null
    } else if (typeof v === 'number' && Number.isInteger(v)) {
      patch.sello_valor_cop = v
    } else {
      return NextResponse.json(
        { error: 'sello_valor_cop debe ser entero o null' },
        { status: 400 }
      )
    }
  }
  for (const k of ['tarjeta_color_fondo', 'tarjeta_color_sello'] as const) {
    if (k in raw) {
      const v = raw[k]
      if (typeof v !== 'string') {
        return NextResponse.json({ error: `${k} debe ser string` }, { status: 400 })
      }
      patch[k] = v
    }
  }
  if ('tarjeta_estilo_sello' in raw) {
    const v = raw.tarjeta_estilo_sello
    if (typeof v !== 'string' || !TARJETA_ESTILOS.includes(v as TarjetaEstilo)) {
      return NextResponse.json(
        { error: `tarjeta_estilo_sello debe ser uno de: ${TARJETA_ESTILOS.join(', ')}` },
        { status: 400 }
      )
    }
    patch.tarjeta_estilo_sello = v as TarjetaEstilo
  }

  try {
    const features = await updateTenantFeatures(auth.tenantId, patch)
    return NextResponse.json(features)
  } catch (err) {
    if (err instanceof TenantFeaturesError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
