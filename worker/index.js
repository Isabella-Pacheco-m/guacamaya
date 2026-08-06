// Worker custom que next-pwa fusiona dentro del sw.js generado.
// Maneja Web Push: mostrar la notificación con la marca del tenant y abrir
// (o enfocar) la PWA al tocarla.

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { titulo: 'Novedades del club', cuerpo: event.data.text() }
  }

  const titulo = payload.titulo || 'Novedades del club'
  const opciones = {
    body: payload.cuerpo || '',
    icon: payload.icono || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(titulo, opciones))
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
