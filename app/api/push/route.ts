import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminTenantId } from '@/lib/api-auth'
import { getTenantFromRequest } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  countPushSuscriptores,
  enviarPushATodos,
  listPushEnvios,
  pushConfigurado,
} from '@/lib/push'

export const dynamic = 'force-dynamic'

const MAX_TITULO = 80
const MAX_CUERPO = 200
const MAX_PATH = 200

export async function GET(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const [suscriptores, envios] = await Promise.all([
    countPushSuscriptores(auth.tenantId),
    listPushEnvios(auth.tenantId),
  ])
  return NextResponse.json({
    suscriptores,
    envios,
    configurado: pushConfigurado(),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTenantId(req)
  if (!auth.ok) return auth.res

  const features = await getTenantFeatures(auth.tenantId)
  if (!features.push_enabled) {
    return NextResponse.json(
      { error: 'Notificaciones no habilitadas' },
      { status: 403 }
    )
  }
  if (!pushConfigurado()) {
    return NextResponse.json(
      { error: 'Notificaciones no configuradas en la plataforma' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { titulo, mensaje, path } = (body ?? {}) as {
    titulo?: unknown
    mensaje?: unknown
    path?: unknown
  }

  if (typeof titulo !== 'string' || titulo.trim().length === 0) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }
  if (titulo.length > MAX_TITULO) {
    return NextResponse.json(
      { error: `El título no puede superar ${MAX_TITULO} caracteres` },
      { status: 400 }
    )
  }
  if (typeof mensaje !== 'string' || mensaje.trim().length === 0) {
    return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 })
  }
  if (mensaje.length > MAX_CUERPO) {
    return NextResponse.json(
      { error: `El mensaje no puede superar ${MAX_CUERPO} caracteres` },
      { status: 400 }
    )
  }

  // Destino del tap: siempre una ruta DENTRO del club (la URL final se arma
  // en el servidor con el subdominio del tenant) — nunca una URL arbitraria.
  let pathFinal: string | null = null
  if (path !== undefined && path !== null && path !== '') {
    if (
      typeof path !== 'string' ||
      !path.startsWith('/') ||
      path.startsWith('//') ||
      path.length > MAX_PATH ||
      /\s/.test(path)
    ) {
      return NextResponse.json(
        { error: 'El enlace debe ser una ruta del club, p. ej. /recompensas' },
        { status: 400 }
      )
    }
    pathFinal = path
  }

  try {
    const tenant = await getTenantFromRequest()
    const resultado = await enviarPushATodos(tenant, {
      titulo: titulo.trim(),
      cuerpo: mensaje.trim(),
      path: pathFinal,
    })
    return NextResponse.json(resultado)
  } catch (err) {
    console.error('POST /api/push', err)
    return NextResponse.json(
      { error: 'No pudimos completar el envío' },
      { status: 500 }
    )
  }
}
