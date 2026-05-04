'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Invitacion } from '@/lib/invitaciones'

interface CreatedInvite {
  id: string
  url: string
  expires_at: string
}

type DisplayInvite =
  | { kind: 'created'; data: CreatedInvite }
  | { kind: 'past'; data: Invitacion }

const fmtDate = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function statusOf(inv: Invitacion): 'canjeada' | 'expirada' | 'pendiente' {
  if (inv.used_at) return 'canjeada'
  if (new Date(inv.expires_at) < new Date()) return 'expirada'
  return 'pendiente'
}

export function InvitacionesPanel({
  miembroId,
  initial,
}: {
  miembroId: string
  initial: Invitacion[]
}) {
  const [past, setPast] = useState<Invitacion[]>(initial)
  const [created, setCreated] = useState<CreatedInvite | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generar() {
    if (loading) return
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/invitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miembro_id: miembroId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al generar enlace')
        return
      }
      setCreated(data as CreatedInvite)
      setPast((prev) => [
        {
          id: data.id,
          tenant_id: '',
          miembro_id: miembroId,
          token_hash: '',
          expires_at: data.expires_at,
          used_at: null,
          used_by_auth0_user_id: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  async function copy(url: string) {
    // navigator.clipboard requiere contexto seguro (HTTPS o localhost). En
    // dev sobre lvh.me (HTTP) cae al fallback con textarea + execCommand.
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) throw new Error('execCommand copy returned false')
      }
      setCopied(true)
      setError(null)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar — selecciona el texto y copia manualmente')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Genera un enlace de invitación para que el cliente entre a su perfil.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={generar}
          disabled={loading}
        >
          {loading ? 'Generando...' : 'Generar enlace'}
        </Button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {created && (
        <div className="rounded-md border border-electric/30 bg-electric/5 p-4 flex flex-col gap-2">
          <div className="text-xs uppercase tracking-wide text-electric font-medium">
            Enlace recién creado · cópialo ahora, no lo volveremos a mostrar
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 truncate text-xs bg-white border border-border rounded px-3 py-2 font-mono">
              {created.url}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copy(created.url)}
            >
              {copied ? '¡Copiado!' : 'Copiar'}
            </Button>
          </div>
          <div className="text-xs text-muted">
            Expira el {fmtDate.format(new Date(created.expires_at))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">
            Historial
          </div>
          <ul className="flex flex-col gap-1">
            {past.map((inv) => (
              <InviteRow key={inv.id} inv={inv} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InviteRow({ inv }: { inv: Invitacion }) {
  const status = statusOf(inv)
  const created = fmtDate.format(new Date(inv.created_at))
  return (
    <li className="flex items-center justify-between text-sm py-1">
      <span className="text-muted">Creada el {created}</span>
      <span
        className={
          status === 'canjeada'
            ? 'text-graphite font-medium'
            : status === 'expirada'
            ? 'text-muted'
            : 'text-electric font-medium'
        }
      >
        {status === 'canjeada'
          ? `Canjeada · ${fmtDate.format(new Date(inv.used_at!))}`
          : status === 'expirada'
          ? `Expirada · ${fmtDate.format(new Date(inv.expires_at))}`
          : `Pendiente · expira ${fmtDate.format(new Date(inv.expires_at))}`}
      </span>
    </li>
  )
}
