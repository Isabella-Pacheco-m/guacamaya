'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Tarjeta de notificaciones del club.
//
// Antes se escondía en silencio si algo no cuadraba (permiso bloqueado, SW
// aún registrándose, navegador sin push) y el miembro no tenía forma de saber
// por qué. Ahora cada situación dice lo suyo: solo desaparece cuando de
// verdad no hay nada que ofrecer (el navegador no soporta push) o cuando el
// propio miembro la descartó.

const DISMISS_KEY = 'push-prompt-dismissed-at'
const DISMISS_DIAS = 30

type Estado =
  | 'cargando'
  | 'disponible' // se puede activar ahora
  | 'guardando'
  | 'suscrito'
  | 'bloqueado' // permiso denegado en el navegador
  | 'sin-sw' // sin service worker: hay que instalar la app (iOS)
  | 'no-soportado'
  | 'descartado'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  // ArrayBuffer explícito: satisface el BufferSource que pide subscribe().
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// El servidor manda un `detalle` (SQLSTATE o marca interna) cuando la
// suscripción no se pudo guardar. Se muestra junto al mensaje: sin él, un
// fallo de permisos en la base es indistinguible de "no pasó nada".
function mensajeError(data: { error?: string; detalle?: string }): string {
  const base = data.error || 'No se pudo guardar la suscripción'
  return data.detalle ? `${base} (${data.detalle})` : base
}

async function esperarServiceWorker(
  timeoutMs: number
): Promise<ServiceWorkerRegistration | null> {
  // .ready con timeout: tras instalar la PWA el registro puede seguir en
  // curso, y en dev el SW está deshabilitado (ahí .ready nunca resuelve).
  // Si aún no hay ninguno registrado, se registra aquí — el layout ya lo
  // hace, pero no queremos depender de qué efecto corrió primero.
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

export function PushPrompt() {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function evaluar() {
      // iPhone: el push solo existe con la PWA instalada (iOS 16.4+). Se
      // comprueba antes que las APIs porque en Safari sin instalar ni
      // siquiera están definidas, y ahí la respuesta útil es "instálala".
      const esIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true
      if (esIos && !standalone) {
        setEstado('sin-sw')
        return
      }

      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setEstado('no-soportado')
        return
      }

      // Espera corta: solo para detectar si YA está suscrito. Que el service
      // worker no esté listo todavía no debe bloquear el botón — la espera
      // larga ocurre dentro del clic, cuando sí hace falta.
      const reg = await esperarServiceWorker(3000)
      if (cancelado) return

      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (cancelado) return
        if (sub) {
          // Ya suscrito en este dispositivo: reenviamos la suscripción al
          // servidor (upsert idempotente) por si su fila se perdió — así el
          // contador del negocio se repara solo. Si el servidor no la acepta
          // NO decimos "activadas": el dispositivo creería estar suscrito
          // mientras el negocio ve cero.
          const json = sub.toJSON()
          const res = await fetch('/api/me/push', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
          }).catch(() => null)
          if (cancelado) return
          if (!res || !res.ok) {
            const data = res ? await res.json().catch(() => ({})) : {}
            setError(mensajeError(data))
            setEstado('disponible')
            return
          }
          setEstado('suscrito')
          return
        }
      }

      if (Notification.permission === 'denied') {
        setEstado('bloqueado')
        return
      }

      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (Date.now() - dismissedAt < DISMISS_DIAS * 86_400_000) {
        setEstado('descartado')
        return
      }

      // El navegador soporta push: se ofrece el botón aunque el service
      // worker aún no esté activo. Antes se caía a "instala la app" por un
      // problema de tiempos y no había forma de activarlas.
      setEstado('disponible')
    }
    // Si la detección falla, ofrecer el botón igual: el clic vuelve a
    // intentarlo y reporta el error real en la tarjeta.
    evaluar().catch(() => setEstado('disponible'))
    return () => {
      cancelado = true
    }
  }, [])

  async function activar() {
    if (estado === 'guardando') return
    setEstado('guardando')
    setError(null)
    try {
      const keyRes = await fetch('/api/me/push')
      const keyData = await keyRes.json().catch(() => ({}))
      if (!keyRes.ok || !keyData.vapidPublicKey) {
        throw new Error(keyData.error || 'Notificaciones no disponibles')
      }

      const permiso = await Notification.requestPermission()
      if (permiso === 'denied') {
        setEstado('bloqueado')
        return
      }
      if (permiso !== 'granted') {
        setEstado('disponible')
        return
      }

      const reg = await esperarServiceWorker(15000)
      if (!reg) {
        setEstado('sin-sw')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.vapidPublicKey),
      })
      const json = sub.toJSON()
      const res = await fetch('/api/me/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(mensajeError(data))
      }
      setEstado('suscrito')
    } catch (err) {
      setEstado('disponible')
      setError(err instanceof Error ? err.message : 'Error inesperado')
    }
  }

  function ahoraNo() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setEstado('descartado')
  }

  if (
    estado === 'cargando' ||
    estado === 'descartado' ||
    estado === 'no-soportado'
  ) {
    return null
  }

  if (estado === 'suscrito') {
    return (
      <Card>
        <p className="eyebrow text-muted mb-1">Notificaciones</p>
        <p className="text-sm text-graphite">
          Activadas — te avisaremos de promos y novedades del club.
        </p>
      </Card>
    )
  }

  if (estado === 'bloqueado') {
    return (
      <Card>
        <p className="eyebrow text-muted mb-2">Notificaciones</p>
        <p className="text-sm text-graphite">
          Las tienes bloqueadas para esta app.
        </p>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          Para recibir promos y novedades, permítelas desde los ajustes del
          sitio en tu navegador y vuelve a entrar.
        </p>
      </Card>
    )
  }

  if (estado === 'sin-sw') {
    return (
      <Card>
        <p className="eyebrow text-electric mb-2">No te pierdas nada</p>
        <p className="text-sm text-graphite">
          Instala la app en tu pantalla de inicio para recibir las
          notificaciones del club.
        </p>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          En iPhone: toca <span className="font-medium">Compartir</span> y
          elige{' '}
          <span className="font-medium">Añadir a pantalla de inicio</span>. Si
          abriste este enlace dentro de otra app (Instagram, Google…), ábrelo
          primero en tu navegador.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <p className="eyebrow text-electric mb-2">No te pierdas nada</p>
      <p className="text-sm text-graphite mb-4">
        Activa las notificaciones y entérate primero de promos, sorteos y
        novedades del club.
      </p>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <div className="flex items-center gap-4">
        {/* Secundario a propósito: el sol es de una sola acción por pantalla
            y en la home ya lo tiene el CTA principal. */}
        <Button
          variant="secondary"
          onClick={activar}
          disabled={estado === 'guardando'}
        >
          {estado === 'guardando' ? 'Activando…' : 'Activar notificaciones'}
        </Button>
        <button
          type="button"
          onClick={ahoraNo}
          className="text-xs text-muted hover:text-graphite"
        >
          Ahora no
        </button>
      </div>
    </Card>
  )
}
