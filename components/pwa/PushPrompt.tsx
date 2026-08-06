'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Invitación a activar notificaciones push. Solo aparece cuando de verdad se
// puede suscribir: hay service worker registrado (PWA en producción), el
// navegador soporta push, el permiso no está denegado y el dispositivo aún no
// está suscrito. "Ahora no" lo silencia un tiempo — pedir permiso a
// destiempo quema la única oportunidad que da el navegador.

const DISMISS_KEY = 'push-prompt-dismissed-at'
const DISMISS_DIAS = 30

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  // ArrayBuffer explícito: satisface el BufferSource que pide subscribe().
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type Estado = 'oculto' | 'elegible' | 'guardando' | 'activado'

export function PushPrompt() {
  const [estado, setEstado] = useState<Estado>('oculto')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function evaluar() {
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window) ||
        Notification.permission === 'denied'
      ) {
        return
      }
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (Date.now() - dismissedAt < DISMISS_DIAS * 86_400_000) return

      // getRegistration (no .ready): en dev el SW está deshabilitado y .ready
      // quedaría colgado para siempre.
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (cancelado) return
      if (!sub) setEstado('elegible')
    }
    evaluar().catch(() => {})
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
      if (permiso !== 'granted') {
        setEstado('oculto')
        return
      }

      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) throw new Error('Instala la app para recibir notificaciones')

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
        throw new Error(data.error || 'No se pudo guardar la suscripción')
      }
      setEstado('activado')
    } catch (err) {
      setEstado('elegible')
      setError(err instanceof Error ? err.message : 'Error inesperado')
    }
  }

  function ahoraNo() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setEstado('oculto')
  }

  if (estado === 'oculto') return null

  if (estado === 'activado') {
    return (
      <Card>
        <p className="eyebrow text-muted mb-1">Notificaciones</p>
        <p className="text-sm text-graphite">
          Listo — te avisaremos de promos y novedades del club.
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
