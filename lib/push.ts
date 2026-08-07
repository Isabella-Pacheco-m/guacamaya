// Solo servidor: usa la service-role key y la clave privada VAPID. El import
// de 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador.
import 'server-only'

import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tenantBaseUrl } from '@/lib/config'
import type { Tenant } from '@/types'

export interface PushEnvio {
  id: string
  tenant_id: string
  titulo: string
  cuerpo: string
  url: string | null
  enviados: number
  fallidos: number
  created_at: string
}

// Claves VAPID de la plataforma (un solo par para todos los tenants: el
// remitente técnico es Guacamaya; la identidad visible de cada notificación
// es la marca del tenant vía título/ícono). Generar con:
//   npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hola@guacamaya.net'

export function pushConfigurado(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null
}

let vapidListo = false
function ensureVapid(): void {
  if (!vapidListo) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidListo = true
  }
}

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
}

// Alta/refresh de la suscripción de un dispositivo. Upsert por endpoint: si el
// mismo navegador se re-suscribe (o entra otra cuenta), la fila se actualiza
// en vez de duplicarse.
export class PushSaveError extends Error {
  constructor(
    message: string,
    /** SQLSTATE de Postgres — p. ej. 42501 = permiso denegado, 42P01 = tabla
     *  inexistente. Se devuelve al cliente para poder diagnosticar sin
     *  revisar los logs del servidor. */
    public readonly code: string
  ) {
    super(message)
    this.name = 'PushSaveError'
  }
}

export async function savePushSuscripcion(
  tenantId: string,
  miembroId: string,
  sub: PushSubscriptionInput
): Promise<void> {
  const { error } = await supabaseAdmin.from('push_suscripciones').upsert(
    {
      tenant_id: tenantId,
      miembro_id: miembroId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) {
    throw new PushSaveError(error.message, error.code ?? 'desconocido')
  }
}

/** ¿El servidor tiene registrado este endpoint? Confirma que la suscripción
 *  quedó guardada de verdad, en vez de fiarse del 200 de la escritura. */
export async function existePushSuscripcion(
  tenantId: string,
  endpoint: string
): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('push_suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('endpoint', endpoint)
  if (error) throw error
  return (count ?? 0) > 0
}

export async function deletePushSuscripcion(
  tenantId: string,
  miembroId: string,
  endpoint: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('push_suscripciones')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('miembro_id', miembroId)
    .eq('endpoint', endpoint)
  if (error) throw error
}

export async function countPushSuscriptores(tenantId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('push_suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if (error) throw error
  return count ?? 0
}

export async function listPushEnvios(
  tenantId: string,
  limit = 20
): Promise<PushEnvio[]> {
  const { data, error } = await supabaseAdmin
    .from('push_envios')
    .select('id, tenant_id, titulo, cuerpo, url, enviados, fallidos, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as PushEnvio[]
}

interface SuscripcionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Push de confirmación al activar las notificaciones.
 *
 * Cierra el ciclo en el momento en que el miembro dice que sí: ve cómo se
 * verán y comprueba que de verdad llegan, en vez de esperar a la primera
 * campaña del negocio para descubrir que algo no funcionaba.
 */
export async function enviarPushDeBienvenida(
  tenant: Pick<Tenant, 'slug' | 'nombre' | 'logo_url'>,
  sub: PushSubscriptionInput
): Promise<void> {
  ensureVapid()
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify({
      titulo: `Listo — ya eres parte de ${tenant.nombre}`,
      cuerpo: 'Así te avisaremos de promos, sorteos y novedades del club.',
      url: tenantBaseUrl(tenant.slug),
      icono: tenant.logo_url ?? undefined,
    }),
    { TTL: 60 * 10, urgency: 'high' }
  )
}

const PAGE = 1000
const CHUNK = 100

/**
 * Envía la campaña a todos los dispositivos suscritos del tenant.
 *
 * Las suscripciones muertas (el usuario revocó el permiso o desinstaló la
 * PWA: el push service responde 404/410) se depuran sobre la marcha — el
 * contador de suscriptores se mantiene honesto solo. Registra el envío en
 * `push_envios` y devuelve los contadores.
 */
export async function enviarPushATodos(
  tenant: Pick<Tenant, 'id' | 'slug' | 'nombre' | 'logo_url'>,
  campana: { titulo: string; cuerpo: string; path?: string | null }
): Promise<{ enviados: number; fallidos: number }> {
  ensureVapid()

  const base = tenantBaseUrl(tenant.slug)
  const url = campana.path ? `${base}${campana.path}` : base
  const payload = JSON.stringify({
    titulo: campana.titulo,
    cuerpo: campana.cuerpo,
    url,
    icono: tenant.logo_url ?? undefined,
  })

  let enviados = 0
  let fallidos = 0
  const muertas: string[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('push_suscripciones')
      .select('id, endpoint, p256dh, auth')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const subs = (data ?? []) as SuscripcionRow[]
    if (subs.length === 0) break

    for (let i = 0; i < subs.length; i += CHUNK) {
      const chunk = subs.slice(i, i + CHUNK)
      const results = await Promise.allSettled(
        chunk.map((s) =>
          webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            // urgency alta: con la normal, Android puede retener el mensaje
            // hasta que el teléfono salga de reposo y la promo llega tarde
            // (o nunca, si expira el TTL antes).
            { TTL: 60 * 60 * 24, urgency: 'high' }
          )
        )
      )
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          enviados += 1
          return
        }
        fallidos += 1
        const status = (r.reason as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          muertas.push(chunk[idx].id)
        }
      })
    }

    if (subs.length < PAGE) break
  }

  if (muertas.length > 0) {
    const { error } = await supabaseAdmin
      .from('push_suscripciones')
      .delete()
      .in('id', muertas)
    if (error) console.error('depurando push_suscripciones muertas', error)
  }

  const { error: envioError } = await supabaseAdmin.from('push_envios').insert({
    tenant_id: tenant.id,
    titulo: campana.titulo,
    cuerpo: campana.cuerpo,
    url: campana.path ? url : null,
    enviados,
    fallidos,
  })
  if (envioError) console.error('registrando push_envio', envioError)

  return { enviados, fallidos }
}
