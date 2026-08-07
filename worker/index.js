// Worker custom que next-pwa fusiona dentro del sw.js generado.
// Maneja Web Push: mostrar la notificación con la marca del tenant y abrir
// (o enfocar) la PWA al tocarla.

// Deja constancia de que el push SÍ llegó al dispositivo, aunque el sistema
// no lo muestre. Sin esto, "no llegó nada" y "llegó pero Android lo silenció"
// son indistinguibles desde fuera. La tarjeta de la PWA lo lee y muestra la
// fecha de la última recibida.
const LOG_CACHE = 'push-log'
const LOG_KEY = '/__ultimo-push'

async function registrarPushRecibido(titulo) {
  try {
    const cache = await caches.open(LOG_CACHE)
    await cache.put(
      LOG_KEY,
      new Response(JSON.stringify({ ts: Date.now(), titulo }), {
        headers: { 'content-type': 'application/json' },
      })
    )
  } catch {
    // El log es un extra: nunca debe impedir que se muestre la notificación.
  }
}

self.addEventListener('push', (event) => {
  // Nunca se sale sin mostrar algo: la suscripción es userVisibleOnly, así
  // que un push sin datos (o con datos ilegibles) que no muestre nada hace
  // que el navegador enseñe su propio aviso genérico — o que no aparezca
  // nada y parezca que la notificación se perdió.
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { cuerpo: event.data.text() }
    }
  }

  const titulo = payload.titulo || 'Novedades del club'
  const opciones = {
    body: payload.cuerpo || '',
    icon: payload.icono || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(
    Promise.all([
      registrarPushRecibido(titulo),
      self.registration.showNotification(titulo, opciones).catch(() =>
        // El ícono del tenant es remoto: si no se puede cargar, mostrarla
        // igual sin adornos antes que quedarnos sin notificación.
        self.registration.showNotification(titulo, {
          body: opciones.body,
          data: opciones.data,
        })
      ),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((ventanas) => {
        // Si la PWA ya está abierta, enfocarla y navegar; si no, abrirla.
        for (const ventana of ventanas) {
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
