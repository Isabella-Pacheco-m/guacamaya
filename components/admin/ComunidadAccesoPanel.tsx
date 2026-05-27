'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

// Panel "cómo se une la gente": el negocio decide si su comunidad es de
// registro abierto (cualquiera entra) y/o comparte un enlace de invitación
// reusable. Los dos caminos crean el miembro automáticamente al ingresar.
export function ComunidadAccesoPanel({
  initialRegistroAbierto,
  initialUrl,
}: {
  initialRegistroAbierto: boolean
  initialUrl: string | null
}) {
  const [abierto, setAbierto] = useState(initialRegistroAbierto)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [savingToggle, setSavingToggle] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    if (savingToggle) return
    const next = !abierto
    setSavingToggle(true)
    setError(null)
    setAbierto(next) // optimista
    try {
      const res = await fetch('/api/tenant/funcionalidades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registro_abierto: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo guardar')
        setAbierto(!next) // revertir
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
      setAbierto(!next)
    } finally {
      setSavingToggle(false)
    }
  }

  async function generar() {
    if (genLoading) return
    setGenLoading(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/tenant/join-code', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo generar el enlace')
        return
      }
      setUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setGenLoading(false)
    }
  }

  async function copy() {
    if (!url) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar — selecciona el texto y cópialo a mano')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Registro abierto */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-graphite">Registro abierto</p>
          <p className="text-xs text-muted mt-0.5 max-w-md">
            Cualquier persona que entre a tu subdominio e inicie sesión puede
            unirse sola, sin enlace. Si lo apagas, la comunidad será solo por
            invitación.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={abierto}
          onClick={toggle}
          disabled={savingToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            abierto ? 'bg-electric' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              abierto ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Enlace de invitación a la comunidad */}
      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-graphite">
              Enlace de invitación
            </p>
            <p className="text-xs text-muted mt-0.5 max-w-md">
              Compártelo por WhatsApp, redes o un QR. Quien lo abra e inicie
              sesión queda asignado a tu comunidad — incluso con el registro
              cerrado. Es reusable; regenerarlo invalida el anterior.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={generar}
            disabled={genLoading}
          >
            {genLoading ? 'Generando...' : url ? 'Regenerar' : 'Generar enlace'}
          </Button>
        </div>

        {url && (
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 border border-border rounded-md px-4 py-3 bg-surface outline-none text-xs font-mono"
            />
            <Button type="button" variant="secondary" onClick={copy}>
              {copied ? '¡Copiado!' : 'Copiar'}
            </Button>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  )
}
