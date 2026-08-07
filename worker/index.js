// Worker custom que next-pwa fusiona dentro del sw.js generado.
// Maneja Web Push: mostrar la notificación con la marca del tenant y abrir
// (o enfocar) la PWA al tocarla.

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
    self.registration.showNotification(titulo, opciones).catch(() =>
      // El ícono del tenant es remoto: si no se puede cargar, mostrarla
      // igual sin adornos antes que quedarnos sin notificación.
      self.registration.showNotification(titulo, {
        body: opciones.body,
        data: opciones.data,
      })
    )
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
