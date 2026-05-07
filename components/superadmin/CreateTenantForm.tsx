'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTenantAction } from '@/app/superadmin/tenants/new/actions'

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface InvitationResult {
  id: string
  email: string | null
  expires_at: string
  claim_url: string
}

interface CreatedTenant {
  id: string
  nombre: string
  slug: string
  color_primario: string
}

export function CreateTenantForm() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [emailDueno, setEmailDueno] = useState('')
  const [puntosPorMil, setPuntosPorMil] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    tenant: CreatedTenant
    invitation: InvitationResult
    domainWarning?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const slugClean = slug.trim().toLowerCase()
  const slugValido =
    slugClean.length >= 2 && SLUG_RE.test(slugClean) && !slugClean.includes('--')
  const emailValido = EMAIL_RE.test(emailDueno.trim().toLowerCase())
  const ppmInt = parseInt(puntosPorMil, 10)
  const ppmValido = Number.isInteger(ppmInt) && ppmInt >= 1 && ppmInt <= 100
  const formValido =
    nombre.trim().length > 0 && slugValido && emailValido && ppmValido

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading || !formValido) return
    setLoading(true)
    setError(null)
    try {
      // Server Action: corre server-side, lee la sesión del mismo contexto
      // que el layout. Sin fetch, sin dependencia de cookies del browser.
      const data = await createTenantAction({
        nombre: nombre.trim(),
        slug: slugClean,
        puntos_por_mil: ppmInt,
        email_dueno: emailDueno.trim().toLowerCase(),
      })
      if (!data.ok || !data.tenant || !data.invitation) {
        setError(data.error ?? 'No se pudo crear el tenant')
        return
      }
      setResult({
        tenant: data.tenant,
        invitation: data.invitation,
        domainWarning: data.domain_warning,
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function copyClaimUrl() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.invitation.claim_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — el textarea sigue siendo seleccionable manualmente
    }
  }

  if (result) {
    const expira = new Date(result.invitation.expires_at)
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-lime/30 text-graphite text-lg">
            ✓
          </span>
          <div>
            <h2 className="text-xl font-light">Negocio creado</h2>
            <p className="text-sm text-muted">
              {result.tenant.nombre} ·{' '}
              <span className="font-mono">{result.tenant.slug}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-5 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-graphite">
              Enlace de invitación para el dueño
            </p>
            <p className="text-xs text-muted mt-0.5">
              Cópialo y mándalo a {result.invitation.email}. Expira el{' '}
              {expira.toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              . Es de un solo uso.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={result.invitation.claim_url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 border border-border rounded-md px-4 py-3 bg-surface outline-none text-xs font-mono"
            />
            <Button type="button" onClick={copyClaimUrl} variant="secondary">
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-muted">
            Cuando el dueño abra el enlace, se le pedirá iniciar sesión en
            Auth0. Después de aceptar tendrá que volver a entrar para que
            su nuevo permiso se aplique al token.
          </p>
        </div>

        {result.domainWarning && (
          <div className="border border-amber-300 bg-amber-50 rounded-md px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Subdominio sin registrar en Vercel</p>
            <p className="mt-1 text-xs leading-relaxed">{result.domainWarning}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setResult(null)
              setNombre('')
              setSlug('')
              setEmailDueno('')
            }}
          >
            Crear otro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Input
        name="nombre"
        label="Nombre del negocio"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        hint="Aparece en la PWA del cliente."
        maxLength={80}
        required
      />

      <Input
        name="slug"
        label="Slug (subdominio)"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase())}
        placeholder="cafe-test"
        hint={
          slug
            ? slugValido
              ? `Subdominio: ${slugClean}.guacamaya.net`
              : '2-30 caracteres: minúsculas, números y guiones'
            : '2-30 caracteres: minúsculas, números y guiones'
        }
        error={
          slug && !slugValido
            ? 'Formato inválido o nombre reservado'
            : undefined
        }
        maxLength={30}
        required
      />

      <Input
        name="email_dueno"
        label="Email del dueño"
        type="email"
        value={emailDueno}
        onChange={(e) => setEmailDueno(e.target.value)}
        hint="Solo se muestra como referencia — el enlace de invitación es lo que da acceso."
        required
      />

      <Input
        name="puntos_por_mil"
        label="Puntos por cada $1.000 COP"
        type="number"
        min={1}
        max={100}
        step={1}
        value={puntosPorMil}
        onChange={(e) => setPuntosPorMil(e.target.value)}
        hint="El dueño puede ajustarlo después desde su panel de marca."
        error={
          puntosPorMil && !ppmValido ? 'Entero entre 1 y 100' : undefined
        }
        required
      />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading || !formValido}>
          {loading ? 'Creando...' : 'Crear y generar invitación'}
        </Button>
      </div>
    </form>
  )
}
