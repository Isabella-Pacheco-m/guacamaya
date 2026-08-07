// Solo servidor: usa la service-role key y la clave privada VAPID. El import
// de 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador.
import 'server-only'

import crypto from 'node:crypto'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tenantBaseUrl } from '@/lib/config'
import {
  isMissingFunction,
  isUndefinedColumn,
  warnSchemaDrift,
} from '@/lib/schema-drift'
import type { Tenant } from '@/types'

// ---------------------------------------------------------------------------
// EL PROBLEMA CENTRAL DE WEB PUSH, Y CÓMO LO TRATA ESTE MÓDULO
//
// El push service (FCM, Mozilla, Apple) responde 201 cuando ACEPTA el mensaje,
// no cuando el celular lo muestra. Entre esas dos cosas hay tres formas de
// perderlo, y las tres son invisibles desde el servidor:
//
//   1. El par de claves VAPID no corresponde  → el navegador verifica la firma
//      contra la clave con la que se suscribió, no cuadra, y descarta.
//   2. La suscripción se creó con OTRA clave pública (se rotaron las claves)
//      → mismo final, y encima el dispositivo nunca se repara solo.
//   3. La suscripción quedó zombi → el endpoint sigue vivo para el servicio
//      pero ya no apunta a nada en el dispositivo.
//
// En los tres casos el panel decía "Llegó a N dispositivos" y no llegaba
// nada. La regla de este módulo es: NUNCA reportar como enviado algo que no
// se puede sostener. Si la configuración es inconsistente, se falla fuerte;
// si la entrega no se puede confirmar, se dice "aceptada", no "entregada".
// La confirmación real la manda el service worker (ver public/push-sw.js).
// ---------------------------------------------------------------------------

export interface PushEnvio {
  id: string
  tenant_id: string
  titulo: string
  cuerpo: string
  url: string | null
  /** Aceptados por el push service. NO significa "mostrados en el celular". */
  enviados: number
  fallidos: number
  /** Confirmados por el propio dispositivo. Esta es la cifra de verdad. */
  entregados: number
  /** Conteo por código HTTP del push service: { "201": 12, "410": 2 }. */
  detalle: Record<string, number> | null
  created_at: string
}

// Claves VAPID de la plataforma (un solo par para todos los tenants: el
// remitente técnico es Guacamaya; la identidad visible de cada notificación
// es la marca del tenant vía título/ícono). Generar con:
//   node scripts/vapid.mjs generar

// base64url canónico. Una clave pegada en base64 normal (con '+', '/' y '=')
// firma igual —el decodificador la acepta— pero NO es igual carácter a
// carácter a la que devuelve el navegador, y todas las comparaciones de
// "¿esta suscripción usa la clave actual?" fallarían para siempre: cada
// apertura de la PWA rehacía la suscripción en un bucle silencioso.
function normalizarClave(v: string): string {
  return v.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const VAPID_PUBLIC_KEY = normalizarClave(process.env.VAPID_PUBLIC_KEY ?? '')
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY ?? '').trim()
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hola@guacamaya.net'

export function pushConfigurado(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null
}

/**
 * ¿La clave pública y la privada configuradas son realmente pareja?
 *
 * La verificación es pura matemática: la pública debe ser el resultado de
 * multiplicar la privada por el punto generador de la curva P-256. Sin este
 * chequeo, un par mal pegado en las variables de entorno es indistinguible de
 * un problema del teléfono — el push service lo acepta igual.
 */
export function vapidParejaValida(): boolean | null {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null
  try {
    const pub = Buffer.from(VAPID_PUBLIC_KEY, 'base64url')
    const priv = Buffer.from(VAPID_PRIVATE_KEY, 'base64url')
    if (pub.length !== 65 || priv.length !== 32) return false
    const ecdh = crypto.createECDH('prime256v1')
    ecdh.setPrivateKey(priv)
    return ecdh.getPublicKey().equals(pub)
  } catch {
    return false
  }
}

/** La plataforma no puede enviar: configuración ausente o inconsistente. */
export class PushConfigError extends Error {
  constructor(message: string, public readonly detalle: string) {
    super(message)
    this.name = 'PushConfigError'
  }
}

/**
 * Puerta de entrada de todo envío.
 *
 * Antes, con un par de claves inconsistente, se enviaba igual: el push
 * service devolvía 201, el contador subía y nadie recibía nada. Ahora eso es
 * un error explícito — es preferible que el negocio vea "no se pudo enviar"
 * a que vea "enviada a 40 dispositivos" y sea mentira.
 */
export function assertPushListo(): void {
  if (!pushConfigurado()) {
    throw new PushConfigError(
      'Notificaciones no configuradas en la plataforma',
      'sin-claves'
    )
  }
  if (vapidParejaValida() === false) {
    throw new PushConfigError(
      'Las claves VAPID de la plataforma no son pareja: los envíos se aceptarían pero ningún dispositivo los mostraría',
      'claves-no-parejas'
    )
  }
}

let vapidListo = false
function ensureVapid(): void {
  assertPushListo()
  if (!vapidListo) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidListo = true
  }
}

// PostgREST devuelve PGRST204 cuando el payload de un INSERT/UPDATE menciona
// una columna que no existe todavía; Postgres devuelve 42703 en los SELECT.
function columnaFaltante(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'PGRST204' || isUndefinedColumn(error)
}

// ---------------------------------------------------------------------------
// Suscripciones
// ---------------------------------------------------------------------------

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
  /** Clave pública VAPID con la que el navegador creó la suscripción. */
  clave?: string | null
}

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

/**
 * Alta/refresh de la suscripción de un dispositivo.
 *
 * Upsert por endpoint: si el mismo navegador se re-suscribe (o entra otra
 * cuenta), la fila se actualiza en vez de duplicarse. Guarda también con qué
 * clave pública se creó: si mañana la plataforma rota las claves, se puede
 * saber qué dispositivos quedaron atados a la vieja en vez de descubrirlo
 * porque "no le llega a nadie".
 */
export async function savePushSuscripcion(
  tenantId: string,
  miembroId: string,
  sub: PushSubscriptionInput
): Promise<void> {
  const fila = {
    tenant_id: tenantId,
    miembro_id: miembroId,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  }

  let { error } = await supabaseAdmin
    .from('push_suscripciones')
    .upsert(
      { ...fila, clave_vapid: sub.clave ?? (VAPID_PUBLIC_KEY || null) },
      { onConflict: 'endpoint' }
    )

  // 0040 sin aplicar: guardar igual lo esencial — perder el diagnóstico es
  // mucho menos grave que perder la suscripción del miembro.
  if (error && columnaFaltante(error)) {
    warnSchemaDrift('savePushSuscripcion', error)
    ;({ error } = await supabaseAdmin
      .from('push_suscripciones')
      .upsert(fila, { onConflict: 'endpoint' }))
  }

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

/** Baja del endpoint anterior cuando el navegador rota la suscripción. */
export async function olvidarEndpoint(
  tenantId: string,
  endpoint: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('push_suscripciones')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('endpoint', endpoint)
  if (error) console.error('olvidarEndpoint', error)
}

export async function countPushSuscriptores(tenantId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('push_suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if (error) throw error
  return count ?? 0
}

/**
 * Confirmación de entrega mandada por el service worker del dispositivo.
 *
 * Idempotente en la base (ver push_registrar_entrega en 0040): el mismo push
 * confirmado dos veces no infla el contador.
 */
export async function registrarEntrega(
  endpoint: string,
  envioId: string | null
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('push_registrar_entrega', {
    p_endpoint: endpoint,
    p_envio_id: envioId,
  })
  if (error) {
    if (isMissingFunction(error)) {
      warnSchemaDrift('registrarEntrega', error)
      return
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------------

export interface DiagnosticoPush {
  configurado: boolean
  /** null = sin claves. false = pública y privada no son pareja. */
  parejaOk: boolean | null
  /** true = falta aplicar 0040; el diagnóstico va incompleto. */
  migracionPendiente: boolean
  suscriptores: number
  /** Suscripciones creadas con una clave pública distinta a la actual: esos
   *  dispositivos no pueden recibir nada hasta volver a suscribirse. */
  claveVieja: number
  /** Dispositivos que han confirmado al menos una entrega alguna vez. */
  confirmados: number
}

export async function diagnosticoPush(
  tenantId: string
): Promise<DiagnosticoPush> {
  const base = {
    configurado: pushConfigurado(),
    parejaOk: vapidParejaValida(),
  }

  const suscriptores = await countPushSuscriptores(tenantId)

  // Conteos en la base, no en memoria: traerse las filas para contarlas aquí
  // toparía con el límite de 1000 de PostgREST y un club grande vería cifras
  // silenciosamente truncadas.
  const contar = (
    afinar: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>
  ) => afinar(baseQuery(tenantId))

  const [vieja, confirmada] = await Promise.all([
    // `neq` descarta también los NULL, que es justo lo que queremos: una
    // suscripción sin clave registrada es anterior a 0040 y no se puede
    // afirmar que esté mal.
    VAPID_PUBLIC_KEY
      ? contar((q) => q.neq('clave_vapid', VAPID_PUBLIC_KEY))
      : Promise.resolve({ count: 0, error: null }),
    contar((q) => q.not('ultima_entrega', 'is', null)),
  ])

  const fallo = vieja.error ?? confirmada.error
  if (fallo) {
    if (!columnaFaltante(fallo)) throw fallo
    warnSchemaDrift('diagnosticoPush', fallo)
    return {
      ...base,
      migracionPendiente: true,
      suscriptores,
      claveVieja: 0,
      confirmados: 0,
    }
  }

  return {
    ...base,
    migracionPendiente: false,
    suscriptores,
    claveVieja: vieja.count ?? 0,
    confirmados: confirmada.count ?? 0,
  }
}

function baseQuery(tenantId: string) {
  return supabaseAdmin
    .from('push_suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
}

const ENVIO_COLS =
  'id, tenant_id, titulo, cuerpo, url, enviados, fallidos, entregados, detalle, created_at'
const ENVIO_COLS_LEGACY =
  'id, tenant_id, titulo, cuerpo, url, enviados, fallidos, created_at'

export async function listPushEnvios(
  tenantId: string,
  limit = 20
): Promise<PushEnvio[]> {
  const query = (cols: string) =>
    supabaseAdmin
      .from('push_envios')
      .select(cols)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

  let { data, error } = await query(ENVIO_COLS)
  if (error && columnaFaltante(error)) {
    warnSchemaDrift('listPushEnvios', error)
    ;({ data, error } = await query(ENVIO_COLS_LEGACY))
    if (error) throw error
    return ((data ?? []) as unknown as PushEnvio[]).map((e) => ({
      ...e,
      entregados: 0,
      detalle: null,
    }))
  }
  if (error) throw error
  return (data ?? []) as unknown as PushEnvio[]
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

interface SuscripcionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/** Códigos con los que el push service dice que la suscripción ya no sirve.
 *  403 = firmada con otra clave VAPID (VapidPkHashMismatch): ese dispositivo
 *  no volverá a recibir nada hasta suscribirse de nuevo, así que la fila se
 *  borra para que la PWA la rehaga en la próxima apertura. */
const ESTADOS_MUERTOS = new Set([403, 404, 410])

function estadoDe(err: unknown): number | null {
  const status = (err as { statusCode?: number })?.statusCode
  return typeof status === 'number' ? status : null
}

function motivoDe(err: unknown): string {
  const status = estadoDe(err)
  const body = (err as { body?: string })?.body
  if (body) return `${status ?? 'error'} ${String(body).slice(0, 80).trim()}`
  if (status) return String(status)
  return err instanceof Error ? err.message.slice(0, 80) : 'error'
}

export interface ResultadoEnvio {
  /** null solo si no se pudo registrar la campaña (0040 sin aplicar). */
  envioId: string | null
  /** Aceptados por el push service. */
  enviados: number
  fallidos: number
  /** Suscripciones muertas depuradas en este envío. */
  purgadas: number
  /** Conteo por código: { "201": 12, "410": 2 }. */
  porEstado: Record<string, number>
}

const PAGE = 1000
const CHUNK = 100

/**
 * Envía la campaña a todos los dispositivos suscritos del tenant.
 *
 * El orden importa: la fila de `push_envios` se crea ANTES de enviar, porque
 * su id viaja dentro del payload y es lo que permite al service worker
 * confirmar la entrega. Al final se actualizan los contadores.
 */
export async function enviarPushATodos(
  tenant: Pick<Tenant, 'id' | 'slug' | 'nombre' | 'logo_url'>,
  campana: { titulo: string; cuerpo: string; path?: string | null }
): Promise<ResultadoEnvio> {
  ensureVapid()

  const base = tenantBaseUrl(tenant.slug)
  const url = campana.path ? `${base}${campana.path}` : base

  const envioId = await crearEnvio(tenant.id, campana, campana.path ? url : null)

  const payload = JSON.stringify({
    id: envioId,
    titulo: campana.titulo,
    cuerpo: campana.cuerpo,
    url,
    icono: tenant.logo_url ?? undefined,
  })

  let enviados = 0
  let fallidos = 0
  const porEstado: Record<string, number> = {}
  const muertas: string[] = []
  const cuenta = (clave: string) => {
    porEstado[clave] = (porEstado[clave] ?? 0) + 1
  }

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
          cuenta(String(r.value.statusCode))
          return
        }
        fallidos += 1
        const status = estadoDe(r.reason)
        cuenta(motivoDe(r.reason))
        if (status !== null && ESTADOS_MUERTOS.has(status)) {
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

  await cerrarEnvio(envioId, enviados, fallidos, porEstado)

  return { envioId, enviados, fallidos, purgadas: muertas.length, porEstado }
}

async function crearEnvio(
  tenantId: string,
  campana: { titulo: string; cuerpo: string },
  url: string | null
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('push_envios')
    .insert({
      tenant_id: tenantId,
      titulo: campana.titulo,
      cuerpo: campana.cuerpo,
      url,
      enviados: 0,
      fallidos: 0,
    })
    .select('id')
    .single()

  if (error) {
    // Sin fila de envío la campaña se manda igual (sin confirmación de
    // entrega ni historial): el negocio prefiere que llegue.
    console.error('crearEnvio', error)
    return null
  }
  return (data as { id: string }).id
}

async function cerrarEnvio(
  envioId: string | null,
  enviados: number,
  fallidos: number,
  porEstado: Record<string, number>
): Promise<void> {
  if (!envioId) return
  let { error } = await supabaseAdmin
    .from('push_envios')
    .update({ enviados, fallidos, detalle: porEstado })
    .eq('id', envioId)

  if (error && columnaFaltante(error)) {
    warnSchemaDrift('cerrarEnvio', error)
    ;({ error } = await supabaseAdmin
      .from('push_envios')
      .update({ enviados, fallidos })
      .eq('id', envioId))
  }
  if (error) console.error('cerrarEnvio', error)
}

// ---------------------------------------------------------------------------
// Prueba de entrega
// ---------------------------------------------------------------------------

export interface ResultadoPrueba {
  /** Host del push service (fcm.googleapis.com, Samsung, Mozilla…). */
  servicio: string
  /** ¿El par de claves VAPID configurado es consistente? */
  clavesOk: boolean | null
  /** ¿La suscripción se creó con la clave pública que usa hoy la plataforma?
   *  Si no, el dispositivo descarta todo lo que se le mande. */
  claveDelDispositivoOk: boolean | null
  /** Push SIN contenido: no lleva cifrado, solo despierta al worker. */
  simple: string
  /** Push con contenido cifrado, el formato normal de las campañas. */
  conDatos: string
}

/**
 * Prueba de entrega en dos formas.
 *
 * Un push con contenido va cifrado con las claves del navegador; si el
 * descifrado falla, el navegador lo descarta sin avisar a nadie y desde el
 * servidor se ve idéntico a un envío perfecto. Mandar también uno SIN
 * contenido —que no necesita descifrado— separa las dos causas: si llega el
 * simple y no el otro, el problema es el cifrado; si no llega ninguno, el
 * mensaje no está alcanzando el dispositivo.
 */
export async function enviarPushDePrueba(
  tenant: Pick<Tenant, 'slug' | 'nombre' | 'logo_url'>,
  sub: PushSubscriptionInput
): Promise<ResultadoPrueba> {
  ensureVapid()
  const suscripcion = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }
  const opciones = { TTL: 60 * 10, urgency: 'high' as const }

  let simple: string
  try {
    const res = await webpush.sendNotification(suscripcion, null, opciones)
    simple = String(res.statusCode)
  } catch (err) {
    console.error('push de prueba (simple)', err)
    simple = motivoDe(err)
  }

  let conDatos: string
  try {
    const res = await webpush.sendNotification(
      suscripcion,
      JSON.stringify({
        titulo: `Listo — ya eres parte de ${tenant.nombre}`,
        cuerpo: 'Así te avisaremos de promos, sorteos y novedades del club.',
        url: tenantBaseUrl(tenant.slug),
        icono: tenant.logo_url ?? undefined,
      }),
      opciones
    )
    conDatos = String(res.statusCode)
  } catch (err) {
    console.error('push de prueba (con datos)', err)
    conDatos = motivoDe(err)
  }

  let servicio = 'desconocido'
  try {
    servicio = new URL(sub.endpoint).host
  } catch {
    // endpoint raro: el host es informativo, no vale la pena fallar por él.
  }

  return {
    servicio,
    clavesOk: vapidParejaValida(),
    claveDelDispositivoOk: sub.clave
      ? sub.clave === VAPID_PUBLIC_KEY
      : null,
    simple,
    conDatos,
  }
}
