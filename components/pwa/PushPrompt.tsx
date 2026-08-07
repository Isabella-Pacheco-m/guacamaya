'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  esIosSinInstalar,
  soportaPush,
  sincronizarSuscripcion,
  ultimoPushRecibido,
  type PruebaServidor,
  type ResultadoSuscripcion,
} from '@/lib/push-client'

// Tarjeta de notificaciones del club.
//
// Toda la lógica de suscripción vive en lib/push-client.ts. Lo importante que
// pasa aquí sin que el miembro haga nada: al montarse se REVALIDA la
// suscripción contra la clave que usa hoy la plataforma y, si quedó
// desactualizada, se rehace sola. Antes había que acordarse de pulsar
// "Reactivar" — y nadie lo hacía, porque la tarjeta decía "Activadas".

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

const recibidaFmt = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

// Lo que ve el miembro tras pedir una prueba. Sin códigos HTTP ni nombres de
// servicio: eso era andamiaje de diagnóstico y su sitio es el panel del
// negocio, no la tarjeta de un cliente del club.
function resumenPrueba(p: PruebaServidor): string {
  if (p.clavesOk === false) {
    return 'Hay un problema de configuración en la plataforma — avísale al negocio.'
  }
  if (p.claveDelDispositivoOk === false) {
    return 'Tu suscripción estaba desactualizada; se rehízo. Vuelve a probar.'
  }
  return 'Te enviamos una notificación de prueba. Si no aparece en unos segundos, revisa que las notificaciones estén permitidas en los ajustes de tu teléfono.'
}

export function PushPrompt() {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [error, setError] = useState<string | null>(null)
  const [ultima, setUltima] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const refrescarUltima = useCallback(() => {
    ultimoPushRecibido().then(setUltima)
  }, [])

  // Traduce el resultado de la sincronización a lo que ve el miembro.
  const aplicar = useCallback((r: ResultadoSuscripcion, activando: boolean) => {
    if (r.ok) {
      setEstado('suscrito')
      setError(null)
      if (r.prueba) setAviso(resumenPrueba(r.prueba))
      else if (r.rehecha) {
        setAviso('Tu suscripción se renovó sola en este dispositivo.')
      }
      return
    }
    switch (r.motivo) {
      case 'no-soportado':
        setEstado('no-soportado')
        break
      case 'permiso-denegado':
        setEstado('bloqueado')
        break
      case 'sin-sw':
        // Al activar sí es un problema real; en la revalidación de fondo
        // simplemente aún no estaba listo el service worker.
        setEstado(activando ? 'sin-sw' : 'disponible')
        if (activando && r.mensaje) setError(r.mensaje)
        break
      case 'permiso-pendiente':
        setEstado('disponible')
        break
      default:
        setEstado('disponible')
        if (activando) setError(r.mensaje ?? 'No se pudo activar')
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    refrescarUltima()

    async function evaluar() {
      // iPhone: el push solo existe con la PWA instalada (iOS 16.4+). Se
      // comprueba antes que las APIs porque en Safari sin instalar ni
      // siquiera están definidas, y ahí la respuesta útil es "instálala".
      if (esIosSinInstalar()) {
        setEstado('sin-sw')
        return
      }
      if (!soportaPush()) {
        setEstado('no-soportado')
        return
      }

      // Revalidación silenciosa: sin pedir permiso. Repara la suscripción si
      // quedó atada a una clave vieja y la reenvía al servidor (upsert
      // idempotente) por si su fila se perdió.
      const r = await sincronizarSuscripcion()
      if (cancelado) return

      if (!r.ok && r.motivo === 'permiso-pendiente') {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
        if (Date.now() - dismissedAt < DISMISS_DIAS * 86_400_000) {
          setEstado('descartado')
          return
        }
      }
      aplicar(r, false)
    }

    // Si la detección falla, ofrecer el botón igual: el clic vuelve a
    // intentarlo y reporta el error real en la tarjeta.
    evaluar().catch(() => setEstado('disponible'))
    return () => {
      cancelado = true
    }
  }, [aplicar, refrescarUltima])

  async function activar() {
    if (ocupado) return
    setOcupado(true)
    setEstado('guardando')
    setError(null)
    setAviso(null)
    const r = await sincronizarSuscripcion({
      pedirPermiso: true,
      // Confirma en el propio celular que llegan de verdad.
      bienvenida: true,
    })
    aplicar(r, true)
    setOcupado(false)
    setTimeout(refrescarUltima, 6000)
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
        {ultima !== null && (
          <p className="text-xs text-muted mt-2">
            Última recibida: {recibidaFmt.format(new Date(ultima))}
          </p>
        )}
        {aviso && <p className="text-xs text-muted mt-2 leading-relaxed">{aviso}</p>}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
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

  // Sin service worker fuera de iPhone no es un problema de instalación: la
  // app no pudo arrancar su worker. Decirle "instálala" a alguien que está en
  // Chrome de escritorio lo manda a un callejón sin salida.
  if (estado === 'sin-sw' && !esIosSinInstalar()) {
    return (
      <Card>
        <p className="eyebrow text-muted mb-2">Notificaciones</p>
        <p className="text-sm text-graphite">
          No pudimos preparar las notificaciones en este navegador.
        </p>
        {error && (
          <p className="text-xs text-muted mt-2 leading-relaxed">{error}</p>
        )}
        <div className="mt-3">
          <button
            type="button"
            onClick={activar}
            disabled={ocupado}
            className="text-xs text-electric hover:underline disabled:opacity-50"
          >
            Reintentar
          </button>
        </div>
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
      {aviso && <p className="text-xs text-muted mb-3">{aviso}</p>}
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
