'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const HEX_RE = /^#[0-9a-f]{6}$/i

export function MarcaForm({
  initialNombre,
  initialColor,
  initialPuntosCumpleanos,
  initialLogoUrl,
  initialBannerUrl,
}: {
  initialNombre: string
  initialColor: string
  initialPuntosCumpleanos: number | null
  initialLogoUrl: string | null
  initialBannerUrl: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(initialNombre)
  const [color, setColor] = useState(initialColor.toUpperCase())
  const [cumpleActivo, setCumpleActivo] = useState(
    initialPuntosCumpleanos !== null && initialPuntosCumpleanos > 0
  )
  const [cumpleMonto, setCumpleMonto] = useState(
    initialPuntosCumpleanos != null && initialPuntosCumpleanos > 0
      ? String(initialPuntosCumpleanos)
      : '100'
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [logoLoading, setLogoLoading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(initialBannerUrl)
  const [bannerLoading, setBannerLoading] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const cumpleValor: number | null = cumpleActivo ? parseInt(cumpleMonto, 10) : null
  const cumpleValido = !cumpleActivo || (Number.isInteger(cumpleValor) && (cumpleValor as number) > 0)

  const dirty =
    nombre.trim() !== initialNombre ||
    color.toUpperCase() !== initialColor.toUpperCase() ||
    cumpleValor !== initialPuntosCumpleanos
  const colorValido = HEX_RE.test(color)
  const nombreValido = nombre.trim().length > 0
  const formValido = colorValido && nombreValido && cumpleValido

  async function onPickFile(file: File) {
    setLogoError(null)
    setLogoLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/tenant/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setLogoError(data.error ?? 'No se pudo subir el logo')
        return
      }
      setLogoUrl(data.tenant.logo_url ?? null)
      router.refresh()
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLogoLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function onDeleteLogo() {
    if (!logoUrl) return
    if (!confirm('¿Quitar el logo actual?')) return
    setLogoError(null)
    setLogoLoading(true)
    try {
      const res = await fetch('/api/tenant/logo', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setLogoError(data.error ?? 'No se pudo quitar el logo')
        return
      }
      setLogoUrl(null)
      router.refresh()
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLogoLoading(false)
    }
  }

  async function onPickBanner(file: File) {
    setBannerError(null)
    setBannerLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/tenant/banner', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setBannerError(data.error ?? 'No se pudo subir el banner')
        return
      }
      setBannerUrl(data.tenant.banner_url ?? null)
      router.refresh()
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setBannerLoading(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  async function onDeleteBanner() {
    if (!bannerUrl) return
    if (!confirm('¿Quitar el banner actual?')) return
    setBannerError(null)
    setBannerLoading(true)
    try {
      const res = await fetch('/api/tenant/banner', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setBannerError(data.error ?? 'No se pudo quitar el banner')
        return
      }
      setBannerUrl(null)
      router.refresh()
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setBannerLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading || !dirty || !formValido) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          color_primario: color,
          puntos_cumpleanos: cumpleValor,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo guardar')
        return
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-graphite">Logo</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-md border border-border bg-surface flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo del negocio"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted">Sin logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPickFile(f)
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoLoading}
              >
                {logoLoading
                  ? 'Procesando...'
                  : logoUrl
                    ? 'Cambiar logo'
                    : 'Subir logo'}
              </Button>
              {logoUrl && !logoLoading && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onDeleteLogo}
                  className="text-red-600"
                >
                  Quitar
                </Button>
              )}
            </div>
            <span className="text-xs text-muted">
              PNG, JPG o WebP. Máximo 2 MB. Idealmente cuadrado.
            </span>
          </div>
        </div>
        {logoError && (
          <span className="text-xs text-red-600">{logoError}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-graphite">
          Banner de portada
        </label>
        <div className="rounded-md border border-border bg-surface overflow-hidden aspect-[16/6] flex items-center justify-center">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt="Banner del negocio"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted">Sin banner</span>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPickBanner(f)
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerLoading}
          >
            {bannerLoading
              ? 'Procesando...'
              : bannerUrl
                ? 'Cambiar banner'
                : 'Subir banner'}
          </Button>
          {bannerUrl && !bannerLoading && (
            <Button
              type="button"
              variant="secondary"
              onClick={onDeleteBanner}
              className="text-red-600"
            >
              Quitar
            </Button>
          )}
        </div>
        <span className="text-xs text-muted">
          PNG, JPG o WebP. Máximo 4 MB. Horizontal (ideal 1600×600). Se muestra
          como portada arriba de la comunidad.
        </span>
        {bannerError && (
          <span className="text-xs text-red-600">{bannerError}</span>
        )}
      </div>

      <Input
        name="nombre"
        label="Nombre del negocio"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        hint="Aparece en la PWA del cliente y en facturas/recibos."
        maxLength={80}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-graphite">
          Color primario
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorValido ? color : '#C2603C'}
            onChange={(e) => setColor(e.target.value.toUpperCase())}
            className="h-12 w-14 rounded-md border border-border cursor-pointer bg-white"
            aria-label="Selector de color"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#C2603C"
            maxLength={7}
            className="flex-1 border border-border rounded-md px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm font-mono uppercase"
          />
        </div>
        <span className="text-xs text-muted">
          Se aplica a links, acentos y la barra de progreso en la PWA del cliente.
        </span>
        {!colorValido && (
          <span className="text-xs text-red-600">
            Formato esperado: #RRGGBB
          </span>
        )}
      </div>

      <div className="rounded-md border border-border p-4 bg-surface flex items-center gap-4">
        <div
          className="h-10 w-10 rounded-full shrink-0"
          style={{ background: colorValido ? color : '#C2603C' }}
        />
        <div className="text-sm">
          <p className="font-medium">Vista previa</p>
          <p className="text-muted text-xs mt-0.5">
            Así se verá el color en los acentos de la PWA.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={cumpleActivo}
            onChange={(e) => setCumpleActivo(e.target.checked)}
            className="mt-1 h-4 w-4 accent-electric"
          />
          <span className="flex-1">
            <span className="text-sm font-medium text-graphite block">
              Regalar puntos por cumpleaños
            </span>
            <span className="text-xs text-muted block mt-0.5">
              Cada miembro recibe puntos automáticamente el día de su cumpleaños.
              Solo se acreditan a quienes tienen fecha de nacimiento registrada.
            </span>
          </span>
        </label>

        {cumpleActivo && (
          <div className="pl-7">
            <label className="text-sm font-medium text-graphite block mb-1.5">
              Puntos por cumpleaños
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              step={1}
              value={cumpleMonto}
              onChange={(e) => setCumpleMonto(e.target.value)}
              className="w-32 border border-border rounded-md px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm"
            />
            {!cumpleValido && (
              <p className="text-xs text-red-600 mt-1">
                Debe ser un entero positivo.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {savedAt && !error && !dirty && (
        <div className="text-sm text-graphite bg-lime/30 border border-lime/40 rounded-md px-3 py-2">
          Cambios guardados.
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={loading || !dirty || !formValido}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
