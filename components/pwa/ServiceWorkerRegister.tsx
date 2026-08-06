'use client'

import { useEffect } from 'react'

// Registra el service worker generado por next-pwa.
//
// next-pwa v5 inyecta el registro solo en el Pages Router (vía _document); con
// App Router genera /sw.js pero nunca lo registra. Sin esto no hay caché
// offline NI notificaciones push — pushManager vive en el registro del SW.
//
// En desarrollo next-pwa está deshabilitado y /sw.js no existe: registrarlo
// dejaría un 404 en consola, así que solo corre en producción.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return
    }
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('No se pudo registrar el service worker', err)
    })
  }, [])

  return null
}
