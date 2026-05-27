'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTenantAction } from '@/app/superadmin/tenants/new/actions'

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    tenant: CreatedTenant
    adminEmail: string
    adminLoginUrl: string
    domainWarning?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const slugClean = slug.trim().toLowerCase()
  const slugValido =
    slugClean.length >= 2 && SLUG_RE.test(slugClean) && !slugClean.includes('--')
  const emailValido = EMAIL_RE.test(emailDueno.trim().toLowerCase())
  const formValido = nombre.trim().length > 0 && slugValido && emailValido

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
        email_dueno: emailDueno.trim().toLowerCase(),
      })
      if (!data.ok || !data.tenant || !data.admin_login_url) {
        setError(data.error ?? 'No se pudo crear el tenant')
        return
      }
      setResult({
        tenant: data.tenant,
        adminEmail: data.admin_email ?? emailDueno.trim().toLowerCase(),
        adminLoginUrl: data.admin_login_url,
        domainWarning: data.domain_warning,
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function copyLoginUrl() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.adminLoginUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — el input sigue siendo seleccionable manualmente
    }
  }

  if (result) {
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
              Acceso del admin
            </p>
            <p className="text-xs text-muted mt-0.5">
              Pídele al dueño que entre a su subdominio e inicie sesión con{' '}
              <span className="font-medium text-graphite">
                {result.adminEmail}
              </span>
              . Con ese correo ya queda como admin — no hay enlace que aceptar.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={result.adminLoginUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 border border-border rounded-md px-4 py-3 bg-surface outline-none text-xs font-mono"
            />
            <Button type="button" onClick={copyLoginUrl} variant="secondary">
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-muted">
            Debe iniciar sesión con ese correo exacto (el mismo que registraste).
            Si entra con otro, no tendrá acceso al panel.
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
