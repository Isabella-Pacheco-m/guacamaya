'use client'

import { useEffect } from 'react'
import { esperarServiceWorker } from '@/lib/push-client'

// Registra el service worker generado por next-pwa.
//
// next-pwa v5 inyecta el registro solo en el Pages Router (vía _document); con
// App Router genera /sw.js pero nunca lo registra. Sin esto no hay caché
// offline NI notificaciones push — pushManager vive en el registro del SW.
//
// La lógica vive en lib/push-client.ts (`esperarServiceWorker`), que además
// comprueba que el worker registrado esté vivo y sea el actual, y lo rehace
// si no lo está. Aquí solo se dispara al cargar cualquier página: así el
// dispositivo se cura aunque el miembro nunca abra la tarjeta de
// notificaciones. En desarrollo no hace nada (next-pwa está deshabilitado).
export function ServiceWorkerRegister() {
  useEffect(() => {
    esperarServiceWorker(15000).catch(() => {})
  }, [])

  return null
}
