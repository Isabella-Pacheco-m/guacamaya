'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { PushEnvio } from '@/lib/push'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const MAX_TITULO = 80
const MAX_CUERPO = 200

export function NotificacionesPanel({
  suscriptores,
  envios: initialEnvios,
  configurado,
}: {
  suscriptores: number
  envios: PushEnvio[]
  configurado: boolean
}) {
  const router = useRouter()
  const [envios, setEnvios] = useState<PushEnvio[]>(initialEnvios)
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [path, setPath] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  async function enviar() {
    if (sending) return
    if (!titulo.trim() || !mensaje.trim()) {
      setError('El título y el mensaje son requeridos')
      return
    }
    if (
      !confirm(
        `¿Enviar esta notificación a los ${suscriptores} dispositivos suscritos? No se puede deshacer.`
      )
    ) {
      return
    }
    setSending(true)
    setError(null)
    setResultado(null)
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          mensaje: mensaje.trim(),
          path: path.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar')
        return
      }
      setResultado(
        data.enviados === 1
          ? 'Enviada a 1 dispositivo.'
          : `Enviada a ${data.enviados} dispositivos.` +
              (data.fallidos > 0 ? ` ${data.fallidos} no la recibieron.` : '')
      )
      setTitulo('')
      setMensaje('')
      setPath('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSending(false)
    }
  }

  if (!configurado) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <p className="text-sm text-graphite">
          Las notificaciones aún no están configuradas en la plataforma
          (faltan las claves VAPID). Escríbenos y las activamos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Suscriptores */}
      <div className="bg-white rounded-lg shadow-card p-5 flex items-baseline gap-3">
        <span className="text-3xl font-light tabular-nums">{suscriptores}</span>
        <div>
          <p className="text-sm font-medium leading-tight">
            {suscriptores === 1
              ? 'dispositivo suscrito'
              : 'dispositivos suscritos'}
          </p>
          <p className="text-xs text-muted mt-0.5">
            Miembros que activaron las notificaciones. En iPhone solo llegan
            con la app instalada en la pantalla de inicio; en Android también
            desde el navegador.
          </p>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="push-titulo">
            Título
          </label>
          <input
            id="push-titulo"
            type="text"
            maxLength={MAX_TITULO}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Hoy 2x1 en toda la carta"
            className="border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="push-mensaje">
            Mensaje
          </label>
          <textarea
            id="push-mensaje"
            rows={3}
            maxLength={MAX_CUERPO}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Solo por hoy, muestra tu app en caja y llévate el segundo gratis."
            className="border border-border rounded-md px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-electric/40"
          />
          <p className="text-xs text-muted text-right tabular-nums">
            {mensaje.length}/{MAX_CUERPO}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="push-path">
            Al tocarla abre{' '}
            <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="push-path"
            type="text"
            maxLength={200}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/recompensas"
            className="border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric/40"
          />
          <p className="text-xs text-muted">
            Una ruta dentro de tu club, p. ej. <code>/recompensas</code> o{' '}
            <code>/comunidad</code>. Si la dejas vacía, abre la home.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {resultado && <p className="text-sm text-graphite">{resultado}</p>}

        <div>
          <Button
            onClick={enviar}
            disabled={sending || suscriptores === 0}
          >
            {sending
              ? 'Enviando…'
              : suscriptores === 0
                ? 'Aún no hay suscriptores'
                : 'Enviar notificación'}
          </Button>
        </div>
      </div>

      {/* Historial */}
      {envios.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="eyebrow text-muted">Envíos recientes</h2>
          <ul className="flex flex-col gap-3">
            {envios.map((e) => (
              <li key={e.id} className="bg-white rounded-lg shadow-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {e.titulo}
                    </p>
                    <p className="text-sm text-muted mt-1">{e.cuerpo}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted whitespace-nowrap">
                    {dateFmt.format(new Date(e.created_at))}
                  </span>
                </div>
                <p className="text-xs text-muted mt-2 tabular-nums">
                  {e.enviados === 1
                    ? 'Llegó a 1 dispositivo'
                    : `Llegó a ${e.enviados} dispositivos`}
                  {e.fallidos > 0 ? ` · ${e.fallidos} fallidos` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
