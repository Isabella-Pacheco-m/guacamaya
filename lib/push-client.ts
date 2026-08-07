// Suscripción push del lado del navegador. Módulo puro de cliente: no toca
// React ni Supabase, solo las APIs del navegador y /api/me/push.
//
// LA REPARACIÓN AUTOMÁTICA ES EL PUNTO DE ESTE ARCHIVO
//
// Una suscripción push queda atada para siempre a la clave pública VAPID con
// la que se creó. Si la plataforma cambia sus claves (o se corrige un par mal
// pegado), TODAS las suscripciones existentes quedan muertas: el push service
// las acepta o las rechaza con 403, pero el miembro sigue viendo "Activadas"
// y el negocio sigue viendo su dispositivo en la lista. Nadie se entera nunca.
//
// Antes, el código veía que ya existía una suscripción y la reenviaba tal
// cual, así que el dispositivo NO PODÍA repararse solo: había que acordarse
// de pulsar "Reactivar" a mano. Ahora, en cada apertura de la PWA se compara
// la clave de la suscripción con la que usa hoy el servidor y, si no
// coinciden, se rehace sola.

export interface ClaveYEstado {
  vapidPublicKey: string
}

export type MotivoFallo =
  | 'no-soportado'
  | 'sin-sw'
  | 'permiso-denegado'
  | 'permiso-pendiente'
  | 'servidor'
  | 'error'

export interface ResultadoSuscripcion {
  ok: boolean
  motivo?: MotivoFallo
  mensaje?: string
  /** true si hubo que rehacer la suscripción por clave desactualizada. */
  rehecha?: boolean
  /** Diagnóstico del push de prueba, si se pidió. */
  prueba?: PruebaServidor
}

export interface PruebaServidor {
  servicio: string
  clavesOk: boolean | null
  claveDelDispositivoOk: boolean | null
  simple: string
  conDatos: string
}

// ---------------------------------------------------------------------------
// Utilidades de codificación
// ---------------------------------------------------------------------------

// Sin anotar el retorno a propósito: el tipo inferido conserva que el buffer
// es un ArrayBuffer real (no SharedArrayBuffer), que es lo que exige el
// BufferSource de pushManager.subscribe().
export function base64UrlToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  // ArrayBuffer explícito: satisface el BufferSource que pide subscribe().
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** base64url canónico: el servidor puede tener la clave guardada en base64
 *  normal ('+', '/', '='), que firma igual pero no compara igual. Sin esto,
 *  la suscripción se vería siempre "desactualizada" y se reharía en bucle. */
export function normalizarClave(v: string): string {
  return v.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Con qué clave pública se creó esta suscripción.
 *
 * Devuelve null si el navegador no expone `options` (algunos WebView viejos):
 * en ese caso NO se puede afirmar que esté desactualizada, así que no se
 * rehace — rehacerla a ciegas en cada apertura sería un bucle de permisos.
 */
export function claveDeSuscripcion(sub: PushSubscription): string | null {
  try {
    const key = sub.options?.applicationServerKey
    if (!key) return null
    return bufferToBase64Url(key as ArrayBuffer)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Service worker
// ---------------------------------------------------------------------------

export function soportaPush(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iPhone: el push solo existe con la PWA instalada en la pantalla de inicio
 *  (iOS 16.4+). En Safari sin instalar las APIs ni siquiera están definidas. */
export function esIosSinInstalar(): boolean {
  if (typeof navigator === 'undefined') return false
  const esIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ se identifica como Mac; el táctil lo delata.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!esIos) return false
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  return !standalone
}

export interface EstadoServiceWorker {
  soportado: boolean
  registrado: boolean
  activo: boolean
  scope: string | null
  /** Error de registro: casi siempre significa que /sw.js no se pudo cargar o
   *  que reventó al evaluarse (p. ej. un importScripts que responde 404). */
  error: string | null
}

/**
 * Estado real del service worker, en texto.
 *
 * Existe porque "el botón de activar vuelve a aparecer en cada recarga" es el
 * síntoma de un worker que no llega a activarse, y desde fuera es idéntico a
 * "el usuario nunca lo activó". Sin esto hay que adivinar.
 */
export async function estadoServiceWorker(): Promise<EstadoServiceWorker> {
  const vacio: EstadoServiceWorker = {
    soportado: false,
    registrado: false,
    activo: false,
    scope: null,
    error: null,
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return vacio
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return {
      soportado: true,
      registrado: Boolean(reg),
      activo: Boolean(reg?.active),
      scope: reg?.scope ?? null,
      error: null,
    }
  } catch (err) {
    return {
      ...vacio,
      soportado: true,
      error: err instanceof Error ? err.message : 'error desconocido',
    }
  }
}

/** Frase corta y accionable sobre por qué no hay service worker. Incluye el
 *  error literal del navegador cuando lo hay: es lo único que permite
 *  diagnosticar el dispositivo de otra persona sin pedirle la consola. */
export function explicarSinSW(e: EstadoServiceWorker): string {
  if (!e.soportado) return 'Este navegador no soporta notificaciones.'
  const detalle = e.error ?? ultimoErrorRegistro()
  if (detalle) return `El navegador rechazó el service worker — ${detalle}`
  if (!e.registrado) {
    return 'La app no pudo instalar su service worker. Suele pasar en ventanas de incógnito o con el almacenamiento del sitio bloqueado en los ajustes del navegador.'
  }
  if (!e.activo) {
    return 'El service worker quedó registrado pero nunca llegó a activarse.'
  }
  return 'El service worker tardó demasiado en estar listo.'
}

// Último error real de registro. console.error no sirve para diagnosticar a
// distancia: el miembro no abre la consola. Se guarda para poder enseñarlo.
let errorRegistro: string | null = null

export function ultimoErrorRegistro(): string | null {
  return errorRegistro
}

async function registrar(): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      // Por defecto el navegador sirve los scripts importados por el worker
      // desde la caché HTTP: un dispositivo podía quedarse con handlers de
      // push viejos indefinidamente.
      updateViaCache: 'none',
    })
    errorRegistro = null
    return reg
  } catch (err) {
    errorRegistro =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('No se pudo registrar el service worker', err)
    return null
  }
}

/**
 * ¿El worker que atiende a este dispositivo está vivo Y es el actual?
 *
 * Se le manda un ping y se espera respuesta. No contesta si murió al
 * evaluarse (el caso real: un `importScripts` de un deploy anterior que ya no
 * existe) ni si es una versión anterior sin este handler. En ambos casos el
 * registro hay que tirarlo: acepta suscripciones y el push service devuelve
 * 201, pero la notificación no se muestra jamás.
 */
async function workerResponde(
  reg: ServiceWorkerRegistration,
  timeoutMs = 3000
): Promise<boolean> {
  const sw = reg.active
  if (!sw) return false
  return new Promise<boolean>((resolve) => {
    let resuelto = false
    const listo = (v: boolean) => {
      if (resuelto) return
      resuelto = true
      resolve(v)
    }
    const canal = new MessageChannel()
    canal.port1.onmessage = (e) => listo(e.data?.tipo === 'pong-push')
    setTimeout(() => listo(false), timeoutMs)
    try {
      sw.postMessage({ tipo: 'ping-push' }, [canal.port2])
    } catch {
      listo(false)
    }
  })
}

function conTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

/**
 * Deja un service worker vivo y actual, curando el que haya si hace falta.
 *
 * Es el único punto donde se registra el worker (lo usan el layout y la
 * tarjeta de notificaciones), justamente para que la reparación ocurra
 * siempre y no dependa de por dónde se entró.
 */
// El layout y la tarjeta de notificaciones piden el worker a la vez. Sin
// compartir el intento, dos reparaciones simultáneas se desregistran la una a
// la otra y el dispositivo se queda sin ninguna. Un éxito se reutiliza el
// resto de la vida de la página; un fallo se descarta para poder reintentar.
let intento: Promise<ServiceWorkerRegistration | null> | null = null

export function esperarServiceWorker(
  timeoutMs: number
): Promise<ServiceWorkerRegistration | null> {
  if (!intento) {
    intento = prepararServiceWorker(timeoutMs)
    intento.then((reg) => {
      if (!reg) intento = null
    })
  }
  return intento
}

async function prepararServiceWorker(
  timeoutMs: number
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  // En dev next-pwa está deshabilitado y /sw.js no existe: registrarlo solo
  // dejaría un 404 en consola.
  if (process.env.NODE_ENV !== 'production') return null

  let reg = await navigator.serviceWorker.getRegistration().catch(() => null)
  if (!reg) reg = await registrar()
  if (!reg) return null

  // Buscar versión nueva antes de nada: un worker instalado puede sobrevivir
  // semanas a un despliegue.
  await reg.update().catch(() => {})

  let listo = await conTimeout(navigator.serviceWorker.ready, timeoutMs)

  // Con worker activo, la prueba de vida decide si sirve o hay que tirarlo.
  if (listo && (await workerResponde(listo))) return listo

  // Registro inservible: desregistrar y empezar de cero. Esto también borra
  // la suscripción push atada a él — es lo correcto: era una suscripción que
  // el push service aceptaba y que no entregaba nada. Quien llama vuelve a
  // suscribir después.
  await (listo ?? reg).unregister().catch(() => {})
  const nuevo = await registrar()
  if (!nuevo) return null
  listo = await conTimeout(navigator.serviceWorker.ready, timeoutMs)
  if (!listo) {
    errorRegistro =
      errorRegistro ?? 'El service worker nuevo no llegó a activarse.'
    return null
  }
  return listo
}

// ---------------------------------------------------------------------------
// API del servidor
// ---------------------------------------------------------------------------

async function leerError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    detalle?: string
  }
  const base = data.error || 'No se pudo guardar la suscripción'
  return data.detalle ? `${base} (${data.detalle})` : base
}

export async function pedirClavePublica(): Promise<string> {
  const res = await fetch('/api/me/push')
  const data = (await res.json().catch(() => ({}))) as {
    vapidPublicKey?: string
    error?: string
  }
  if (!res.ok || !data.vapidPublicKey) {
    throw new Error(data.error || 'Notificaciones no disponibles')
  }
  return normalizarClave(data.vapidPublicKey)
}

async function registrarEnServidor(
  sub: PushSubscription,
  clave: string,
  opciones: { anterior?: string | null; bienvenida?: boolean }
): Promise<PruebaServidor | undefined> {
  const json = sub.toJSON()
  const res = await fetch('/api/me/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: json.keys,
      clave,
      anterior: opciones.anterior ?? null,
      bienvenida: opciones.bienvenida === true,
    }),
  })
  if (!res.ok) throw new Error(await leerError(res))
  const data = (await res.json().catch(() => ({}))) as { prueba?: PruebaServidor }
  return data.prueba
}

// ---------------------------------------------------------------------------
// Sincronización
// ---------------------------------------------------------------------------

interface OpcionesSync {
  /** Pedir el permiso si aún no se ha concedido. Solo desde un gesto del
   *  usuario: `Notification.requestPermission()` lo exige en móvil. */
  pedirPermiso?: boolean
  /** Pedir al servidor la notificación de prueba tras registrar. */
  bienvenida?: boolean
}

/**
 * Deja este dispositivo suscrito y registrado, reparando lo que haga falta.
 *
 * Es la única función que crea suscripciones: la tarjeta de la PWA la llama
 * al montarse (sin pedir permiso, para reparar en silencio) y al pulsar
 * "Activar" (pidiéndolo).
 */
export async function sincronizarSuscripcion(
  opciones: OpcionesSync = {}
): Promise<ResultadoSuscripcion> {
  if (!soportaPush()) return { ok: false, motivo: 'no-soportado' }

  try {
    const clave = await pedirClavePublica()

    const reg = await esperarServiceWorker(opciones.pedirPermiso ? 15000 : 4000)
    if (!reg) {
      // Sin worker no hay push posible. Se explica el porqué en vez de dejar
      // al miembro pulsando un botón que nunca va a funcionar.
      const estado = await estadoServiceWorker()
      return { ok: false, motivo: 'sin-sw', mensaje: explicarSinSW(estado) }
    }

    let sub = await reg.pushManager.getSubscription()
    let rehecha = false
    let anterior: string | null = null

    // Suscripción atada a una clave que ya no es la de la plataforma: no
    // sirve para nada y el servidor no puede arreglarla. Se rehace aquí.
    if (sub) {
      const suya = claveDeSuscripcion(sub)
      const desactualizada = suya !== null && suya !== clave
      if (desactualizada) {
        anterior = sub.endpoint
        await sub.unsubscribe().catch(() => false)
        sub = null
        rehecha = true
      }
    }

    if (!sub) {
      if (Notification.permission === 'denied') {
        return { ok: false, motivo: 'permiso-denegado' }
      }
      if (Notification.permission !== 'granted') {
        if (!opciones.pedirPermiso) {
          return { ok: false, motivo: 'permiso-pendiente' }
        }
        const permiso = await Notification.requestPermission()
        if (permiso === 'denied') return { ok: false, motivo: 'permiso-denegado' }
        if (permiso !== 'granted') return { ok: false, motivo: 'permiso-pendiente' }
      }

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(clave),
      })
    }

    const prueba = await registrarEnServidor(sub, clave, {
      anterior,
      bienvenida: opciones.bienvenida,
    })

    return { ok: true, rehecha, prueba }
  } catch (err) {
    return {
      ok: false,
      motivo: 'error',
      mensaje: err instanceof Error ? err.message : 'Error inesperado',
    }
  }
}

