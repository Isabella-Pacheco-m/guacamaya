/* eslint-disable */
// Service worker de notificaciones push.
//
// POR QUÉ ESTE ARCHIVO ES ESTÁTICO Y VIVE EN /public
// --------------------------------------------------
// Antes esto era `worker/index.js` y next-pwa lo compilaba con webpack a
// `public/worker-<buildId>.js`. Ese camino tiene una condición de carrera
// real: next-pwa lanza esa compilación con `webpack().run()` y NUNCA la
// espera, pero igual escribe `importScripts("worker-<buildId>.js")` dentro de
// sw.js. Si el build termina antes que esa compilación (o el archivo no queda
// en el output del deploy), el importScripts responde 404, el service worker
// revienta al evaluarse y el navegador se queda con el ANTERIOR o sin
// ninguno: sin push y sin caché, sin un solo error visible.
//
// Un archivo plano en /public no se compila, no puede faltar y va versionado
// en git. next.config.js lo enlaza con un hash de su contenido en la query
// (`/push-sw.js?v=…`) para que el navegador no sirva una copia vieja.
//
// Este archivo se ejecuta DENTRO del sw.js generado por next-pwa (mismo
// scope global), así que no debe registrar nada de caché: solo push.

;(function () {
  'use strict'

  // Deja constancia local de cada push recibido. La tarjeta de notificaciones
  // de la PWA lo lee para poder decir "última recibida: …" — sin esto, "no
  // llegó" y "llegó pero el sistema no la mostró" son indistinguibles.
  var LOG_CACHE = 'push-log'
  var LOG_KEY = '/__ultimo-push'

  async function anotarRecibido(titulo) {
    try {
      var cache = await caches.open(LOG_CACHE)
      await cache.put(
        LOG_KEY,
        new Response(JSON.stringify({ ts: Date.now(), titulo: titulo }), {
          headers: { 'content-type': 'application/json' },
        })
      )
    } catch (e) {
      // El log es un extra: jamás debe impedir que se muestre la notificación.
    }
  }

  // Confirma al servidor que ESTE dispositivo recibió el push.
  //
  // Es la única prueba real de entrega: el push service devuelve 201 aunque
  // el mensaje se descarte después en el teléfono. Con esta confirmación el
  // panel del negocio puede decir "aceptadas 12 · entregadas 12" en vez de
  // dar por buena una entrega que nunca ocurrió.
  async function confirmarEntrega(envioId) {
    try {
      var sub = await self.registration.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push/entregas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // El endpoint es el identificador del dispositivo; no hace falta
        // sesión (el service worker puede despertarse sin ninguna pestaña
        // abierta y sin cookie válida).
        credentials: 'omit',
        body: JSON.stringify({ endpoint: sub.endpoint, envioId: envioId || null }),
      })
    } catch (e) {
      // Sin red o servidor caído: la notificación ya se mostró, que es lo
      // que le importa al miembro. La confirmación se pierde y ya.
    }
  }

  self.addEventListener('push', function (event) {
    // La suscripción es userVisibleOnly: si este handler termina sin mostrar
    // nada, el navegador enseña su propio aviso genérico ("Este sitio se
    // actualizó en segundo plano") o directamente nada. Por eso aquí no hay
    // ningún camino que no acabe en showNotification.
    var payload = {}
    if (event.data) {
      try {
        payload = event.data.json() || {}
      } catch (e) {
        payload = { cuerpo: event.data.text() }
      }
    }

    var titulo = payload.titulo || 'Novedades del club'
    var opciones = {
      body: payload.cuerpo || '',
      icon: payload.icono || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Sin tag: dos avisos seguidos del club no deben pisarse.
      timestamp: Date.now(),
      data: { url: payload.url || '/', envioId: payload.id || null },
    }

    event.waitUntil(
      (async function () {
        try {
          await self.registration.showNotification(titulo, opciones)
        } catch (e) {
          // El ícono del tenant es remoto: si falla la carga, mostrarla
          // igual sin adornos antes que quedarnos sin notificación.
          await self.registration.showNotification(titulo, {
            body: opciones.body,
            data: opciones.data,
          })
        }
        await Promise.all([anotarRecibido(titulo), confirmarEntrega(payload.id)])
      })()
    )
  })

  self.addEventListener('notificationclick', function (event) {
    event.notification.close()
    var url = (event.notification.data && event.notification.data.url) || '/'

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (ventanas) {
          // Si la PWA ya está abierta, enfocarla y navegar; si no, abrirla.
          for (var i = 0; i < ventanas.length; i++) {
            var ventana = ventanas[i]
            if ('focus' in ventana) {
              ventana.focus()
              if ('navigate' in ventana) return ventana.navigate(url)
              return undefined
            }
          }
          return self.clients.openWindow(url)
        })
    )
  })

  // El navegador puede invalidar y rotar la suscripción por su cuenta (cambio
  // de claves del push service, limpieza de almacenamiento, reinstalación).
  // Cuando eso pasa el endpoint guardado queda muerto: los envíos se siguen
  // aceptando y nada llega, para siempre, porque el servidor no tiene forma
  // de enterarse. Aquí se rehace la suscripción y se registra la nueva sin
  // que el miembro tenga que hacer nada.
  self.addEventListener('pushsubscriptionchange', function (event) {
    event.waitUntil(
      (async function () {
        try {
          var vieja = event.oldSubscription || null
          var res = await fetch('/api/push/clave', { credentials: 'omit' })
          var data = await res.json()
          if (!data || !data.vapidPublicKey) return

          var nueva =
            event.newSubscription ||
            (await self.registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64UrlToUint8Array(data.vapidPublicKey),
            }))

          var json = nueva.toJSON()
          // Camino autenticado normal (la cookie de sesión sigue viva aunque
          // no haya ninguna pestaña abierta). `anterior` da de baja el
          // endpoint muerto en el mismo movimiento.
          await fetch('/api/me/push', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              anterior: vieja ? vieja.endpoint : null,
              endpoint: nueva.endpoint,
              keys: json.keys,
              clave: data.vapidPublicKey,
            }),
          })
        } catch (e) {
          // Si no se pudo rehacer aquí, la PWA lo repara sola la próxima vez
          // que el miembro la abra (lib/push-client.ts revalida siempre).
        }
      })()
    )
  })

  function base64UrlToUint8Array(base64) {
    var padding = '='.repeat((4 - (base64.length % 4)) % 4)
    var b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    var raw = self.atob(b64)
    var out = new Uint8Array(new ArrayBuffer(raw.length))
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
    return out
  }
})()
