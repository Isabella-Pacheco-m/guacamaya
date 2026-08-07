'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { DiagnosticoPush, PushEnvio } from '@/lib/push'

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

interface ResultadoEnvio {
  enviados: number
  fallidos: number
  purgadas: number
  porEstado: Record<string, number>
}

// El push service responde 201 cuando ACEPTA el mensaje, no cuando el celular
// lo muestra. Por eso el panel separa siempre las dos cifras: "aceptadas" es
// lo que dice Google/Apple, "confirmadas" es lo que reportó el propio
// dispositivo al recibirlas. Cuando las dos coinciden, la campaña llegó.
function textoResultado(r: ResultadoEnvio): string {
  const partes = [
    r.enviados === 1
      ? 'Aceptada por el servicio para 1 dispositivo'
      : `Aceptada por el servicio para ${r.enviados} dispositivos`,
  ]
  if (r.fallidos > 0) partes.push(`${r.fallidos} fallaron`)
  if (r.purgadas > 0) {
    partes.push(
      r.purgadas === 1
        ? '1 suscripción inválida se dio de baja'
        : `${r.purgadas} suscripciones inválidas se dieron de baja`
    )
  }
  return `${partes.join(' · ')}. En unos segundos aparecerá abajo cuántos dispositivos la confirmaron.`
}

export function NotificacionesPanel({
  diagnostico,
  envios: initialEnvios,
}: {
  diagnostico: DiagnosticoPush
  envios: PushEnvio[]
}) {
  const router = useRouter()
  const [envios] = useState<PushEnvio[]>(initialEnvios)
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [path, setPath] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  const { suscriptores, claveVieja, confirmados } = diagnostico
  const bloqueado = diagnostico.parejaOk === false

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
      setResultado(textoResultado(data as ResultadoEnvio))
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

  if (!diagnostico.configurado) {
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
      {/* Diagnóstico — solo aparece cuando hay algo que decir */}
      {bloqueado && (
        <div className="bg-white rounded-lg shadow-card p-5 border border-red-200">
          <p className="text-sm font-medium text-red-700">
            Las claves de notificaciones están mal configuradas.
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            La clave pública y la privada no son pareja: los envíos se
            aceptarían pero ningún celular los mostraría. Los envíos están
            bloqueados hasta corregirlas en la plataforma — es preferible a
            reportarte un alcance que no ocurrió.
          </p>
        </div>
      )}

      {diagnostico.migracionPendiente && (
        <div className="bg-white rounded-lg shadow-card p-5 border border-amber-200">
          <p className="text-sm font-medium text-graphite">
            Falta aplicar la migración 0040.
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Las notificaciones se envían igual, pero hasta aplicarla no se
            puede confirmar cuáles llegaron de verdad al celular.
          </p>
        </div>
      )}

      {claveVieja > 0 && (
        <div className="bg-white rounded-lg shadow-card p-5 border border-amber-200">
          <p className="text-sm font-medium text-graphite">
            {claveVieja === 1
              ? '1 dispositivo quedó con una suscripción desactualizada'
              : `${claveVieja} dispositivos quedaron con una suscripción desactualizada`}
            .
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Se suscribieron con unas claves anteriores de la plataforma, así
            que hoy no pueden recibir nada. Se reparan solos la próxima vez
            que su dueño abra la app del club.
          </p>
        </div>
      )}

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
            {confirmados > 0
              ? `${confirmados} han confirmado que reciben notificaciones. `
              : ''}
            Miembros que las activaron desde su app del club. En iPhone solo
            llegan con la app instalada en la pantalla de inicio; en Android
            también desde el navegador.
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
        {resultado && (
          <p className="text-sm text-graphite leading-relaxed">{resultado}</p>
        )}

        <div>
          <Button
            onClick={enviar}
            disabled={sending || suscriptores === 0 || bloqueado}
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
                  <span className="text-graphite font-medium">
                    {e.entregados}
                  </span>{' '}
                  {e.entregados === 1
                    ? 'dispositivo confirmó que la recibió'
                    : 'dispositivos confirmaron que la recibieron'}{' '}
                  · {e.enviados} aceptadas por el servicio
                  {e.fallidos > 0 ? ` · ${e.fallidos} fallidas` : ''}
                </p>
                {e.detalle && Object.keys(e.detalle).length > 0 && (
                  <p className="text-[11px] text-muted mt-1 font-mono">
                    {Object.entries(e.detalle)
                      .map(([codigo, n]) => `${codigo}×${n}`)
                      .join('  ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted leading-relaxed">
            &ldquo;Aceptadas&rdquo; es lo que respondió el servicio de
            notificaciones (Google, Apple); &ldquo;confirmadas&rdquo; es lo que
            reportó el celular al recibirlas. Si hay aceptadas pero ninguna
            confirmada, el mensaje se está perdiendo entre el servicio y el
            dispositivo.
          </p>
        </div>
      )}
    </div>
  )
}
