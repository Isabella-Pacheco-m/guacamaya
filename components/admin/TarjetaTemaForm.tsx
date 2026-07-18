'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TarjetaCliente } from '@/components/pwa/TarjetaCliente'
import {
  ESTILO_GLYPH,
  ESTILO_LABEL,
  TARJETA_ESTILOS,
  TARJETA_PRESETS,
  type TarjetaEstilo,
  type TarjetaFondoTipo,
  type TenantFeatures,
} from '@/lib/tarjeta'
import type { TarjetaPremio } from '@/lib/tenantQueries'

const HEX_RE = /^#[0-9a-f]{6}$/i
const SIZE_MIN = 2
const SIZE_MAX = 50
const SIZE_PRESETS = [5, 8, 10, 12] as const

export function TarjetaTemaForm({
  features,
  tenantNombre,
  premios,
}: {
  features: TenantFeatures
  tenantNombre: string
  premios: TarjetaPremio[]
}) {
  const router = useRouter()
  const selloFileRef = useRef<HTMLInputElement>(null)
  const [colorFondo, setColorFondo] = useState(features.tarjeta_color_fondo.toUpperCase())
  const [colorSello, setColorSello] = useState(features.tarjeta_color_sello.toUpperCase())
  const [estilo, setEstilo] = useState<TarjetaEstilo>(features.tarjeta_estilo_sello)
  const [size, setSize] = useState(features.tarjeta_size)
  const [valor, setValor] = useState(
    features.sello_valor_cop != null ? String(features.sello_valor_cop) : ''
  )
  const [fondoTipo, setFondoTipo] = useState<TarjetaFondoTipo>(
    features.tarjeta_fondo_tipo
  )
  const [colorFondo2, setColorFondo2] = useState(
    (features.tarjeta_color_fondo2 ?? '#C2603C').toUpperCase()
  )
  const [selloUrl, setSelloUrl] = useState<string | null>(features.tarjeta_sello_url)
  const [selloLoading, setSelloLoading] = useState(false)
  const [selloError, setSelloError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const fondoValido = HEX_RE.test(colorFondo)
  const fondo2Valido = HEX_RE.test(colorFondo2)
  const selloValido = HEX_RE.test(colorSello)
  const sizeValido = Number.isInteger(size) && size >= SIZE_MIN && size <= SIZE_MAX
  // "Valor por sello" es opcional: vacío = null. Si trae valor, entero positivo.
  const valorTrim = valor.trim()
  const valorNum = valorTrim === '' ? null : Number(valorTrim)
  const valorValido =
    valorTrim === '' || (Number.isInteger(valorNum) && (valorNum as number) > 0)
  const fondo2Guardado = (features.tarjeta_color_fondo2 ?? '').toUpperCase()
  const dirty =
    colorFondo.toUpperCase() !== features.tarjeta_color_fondo.toUpperCase() ||
    colorSello.toUpperCase() !== features.tarjeta_color_sello.toUpperCase() ||
    estilo !== features.tarjeta_estilo_sello ||
    size !== features.tarjeta_size ||
    valorNum !== features.sello_valor_cop ||
    fondoTipo !== features.tarjeta_fondo_tipo ||
    (fondoTipo === 'gradient' && colorFondo2.toUpperCase() !== fondo2Guardado)

  // Premios que quedarían sin alcanzar si se reduce el tamaño por debajo de su
  // umbral — se avisa para que el admin los ajuste en la sección de Premios.
  const premiosHuérfanos = premios.filter((p) => p.threshold > size)

  // Vista previa con sellos rellenos a 60% para mostrar contraste y diseño.
  const sellosPreview = useMemo(
    () => Math.max(1, Math.round(size * 0.6)),
    [size]
  )
  const premiosPreview = useMemo(
    () =>
      premios
        .filter((p) => p.threshold <= size)
        .map((p) => ({
          ...p,
          alcanzado: sellosPreview >= p.threshold,
          canjeado: false,
        })),
    [premios, size, sellosPreview]
  )

  function applyPreset(p: (typeof TARJETA_PRESETS)[number]) {
    setColorFondo(p.colorFondo.toUpperCase())
    setColorSello(p.colorSello.toUpperCase())
    setEstilo(p.estilo)
    setSavedAt(null)
  }

  async function onPickSello(file: File) {
    setSelloError(null)
    setSelloLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/tenant/tarjeta-sello', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSelloError(data.error ?? 'No se pudo subir la estampilla')
        return
      }
      setSelloUrl(data.features?.tarjeta_sello_url ?? null)
      router.refresh()
    } catch (err) {
      setSelloError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setSelloLoading(false)
      if (selloFileRef.current) selloFileRef.current.value = ''
    }
  }

  async function onRemoveSello() {
    setSelloError(null)
    setSelloLoading(true)
    try {
      const res = await fetch('/api/tenant/tarjeta-sello', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSelloError(data.error ?? 'No se pudo quitar la estampilla')
        return
      }
      setSelloUrl(null)
      router.refresh()
    } catch (err) {
      setSelloError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setSelloLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (
      !dirty ||
      saving ||
      !fondoValido ||
      !selloValido ||
      !sizeValido ||
      !valorValido ||
      (fondoTipo === 'gradient' && !fondo2Valido)
    )
      return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/funcionalidades', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tarjeta_color_fondo: colorFondo,
          tarjeta_color_sello: colorSello,
          tarjeta_estilo_sello: estilo,
          tarjeta_size: size,
          sello_valor_cop: valorNum,
          tarjeta_fondo_tipo: fondoTipo,
          tarjeta_color_fondo2: fondoTipo === 'gradient' ? colorFondo2 : null,
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
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted mb-3">
          Vista previa
        </p>
        <TarjetaCliente
          tenantNombre={tenantNombre}
          miembroNombre="María García"
          sellos={sellosPreview}
          tarjetaSize={sizeValido ? size : features.tarjeta_size}
          premios={premiosPreview}
          colorFondo={fondoValido ? colorFondo : features.tarjeta_color_fondo}
          colorSello={selloValido ? colorSello : features.tarjeta_color_sello}
          estiloSello={estilo}
          fondoTipo={fondoTipo}
          colorFondo2={fondo2Valido ? colorFondo2 : null}
          selloUrl={selloUrl}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-graphite">
          Combinaciones rápidas
        </label>
        <div className="flex flex-wrap gap-2">
          {TARJETA_PRESETS.map((p) => {
            const active =
              colorFondo.toUpperCase() === p.colorFondo.toUpperCase() &&
              colorSello.toUpperCase() === p.colorSello.toUpperCase() &&
              estilo === p.estilo
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={
                  'flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1.5 text-sm transition-colors ' +
                  (active
                    ? 'border-graphite bg-graphite text-white'
                    : 'border-border bg-white text-graphite hover:border-graphite/40')
                }
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10 shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${p.colorFondo} 0 50%, ${p.colorSello} 50% 100%)`,
                  }}
                  aria-hidden
                />
                {p.nombre}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-graphite">
            Color de fondo
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={fondoValido ? colorFondo : '#2A2320'}
              onChange={(e) => setColorFondo(e.target.value.toUpperCase())}
              className="h-12 w-14 rounded-md border border-border cursor-pointer bg-white"
              aria-label="Selector color de fondo"
            />
            <input
              type="text"
              value={colorFondo}
              onChange={(e) => setColorFondo(e.target.value)}
              maxLength={7}
              className="flex-1 border border-border rounded-md px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm font-mono uppercase"
            />
          </div>
          {!fondoValido && (
            <span className="text-xs text-red-600">Formato esperado: #RRGGBB</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-graphite">
            Color del sello
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={selloValido ? colorSello : '#EBBA4F'}
              onChange={(e) => setColorSello(e.target.value.toUpperCase())}
              className="h-12 w-14 rounded-md border border-border cursor-pointer bg-white"
              aria-label="Selector color del sello"
            />
            <input
              type="text"
              value={colorSello}
              onChange={(e) => setColorSello(e.target.value)}
              maxLength={7}
              className="flex-1 border border-border rounded-md px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm font-mono uppercase"
            />
          </div>
          {!selloValido && (
            <span className="text-xs text-red-600">Formato esperado: #RRGGBB</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-graphite">Tipo de fondo</label>
        <div className="flex gap-2">
          {(['solid', 'gradient'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setFondoTipo(t)
                setSavedAt(null)
              }}
              className={
                'rounded-full border px-4 py-2 text-sm transition-colors ' +
                (fondoTipo === t
                  ? 'border-graphite bg-graphite text-white'
                  : 'border-border bg-white text-graphite hover:border-graphite/40')
              }
            >
              {t === 'solid' ? 'Color sólido' : 'Degradado'}
            </button>
          ))}
        </div>
        {fondoTipo === 'gradient' && (
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-sm font-medium text-graphite">
              Segundo color del degradado
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={fondo2Valido ? colorFondo2 : '#C2603C'}
                onChange={(e) => {
                  setColorFondo2(e.target.value.toUpperCase())
                  setSavedAt(null)
                }}
                className="h-12 w-14 rounded-md border border-border cursor-pointer bg-white"
                aria-label="Segundo color del degradado"
              />
              <input
                type="text"
                value={colorFondo2}
                onChange={(e) => {
                  setColorFondo2(e.target.value)
                  setSavedAt(null)
                }}
                maxLength={7}
                className="flex-1 border border-border rounded-md px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm font-mono uppercase"
              />
            </div>
            {!fondo2Valido && (
              <span className="text-xs text-red-600">Formato esperado: #RRGGBB</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-graphite">
          Estampilla del sello{' '}
          <span className="font-normal text-muted">(opcional)</span>
        </label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-md border border-border bg-graphite flex items-center justify-center overflow-hidden shrink-0">
            {selloUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selloUrl}
                alt="Estampilla"
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="text-[10px] text-white/60 text-center px-1">
                Sin PNG
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={selloFileRef}
              type="file"
              accept="image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPickSello(f)
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => selloFileRef.current?.click()}
                disabled={selloLoading}
              >
                {selloLoading
                  ? 'Procesando...'
                  : selloUrl
                    ? 'Cambiar estampilla'
                    : 'Subir estampilla'}
              </Button>
              {selloUrl && !selloLoading && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onRemoveSello}
                  className="text-red-600"
                >
                  Quitar
                </Button>
              )}
            </div>
            <span className="text-xs text-muted">
              PNG o WebP con fondo transparente. Máximo 1 MB. Se ve como silueta
              oscura sin marcar y a color al marcarse. Reemplaza la figura del
              estilo.
            </span>
          </div>
        </div>
        {selloError && <span className="text-xs text-red-600">{selloError}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-graphite">
          Número de sellos
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSize(s)
                setSavedAt(null)
              }}
              className={
                'rounded-full border px-4 py-2 text-sm transition-colors ' +
                (size === s
                  ? 'border-graphite bg-graphite text-white'
                  : 'border-border bg-white text-graphite hover:border-graphite/40')
              }
            >
              {s}
            </button>
          ))}
          <input
            type="number"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={size}
            onChange={(e) => {
              setSize(Math.trunc(Number(e.target.value)))
              setSavedAt(null)
            }}
            aria-label="Número de sellos personalizado"
            className="w-24 border border-border rounded-md px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm tabular-nums"
          />
        </div>
        <span className="text-xs text-muted">
          Entre {SIZE_MIN} y {SIZE_MAX}. El premio del último sello reinicia la
          tarjeta al canjearse.
        </span>
        {!sizeValido && (
          <span className="text-xs text-red-600">
            Debe ser un entero entre {SIZE_MIN} y {SIZE_MAX}.
          </span>
        )}
        {sizeValido && premiosHuérfanos.length > 0 && (
          <span className="text-xs text-amber-600">
            {premiosHuérfanos.length === 1
              ? 'Hay 1 premio'
              : `Hay ${premiosHuérfanos.length} premios`}{' '}
            por encima de {size} sellos que quedarán sin alcanzar. Ajústalos en
            la sección Premios.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-graphite">
          Valor por sello{' '}
          <span className="font-normal text-muted">(opcional)</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">$</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="ej: 10000"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value)
              setSavedAt(null)
            }}
            aria-label="Valor en COP de cada sello"
            className="w-40 border border-border rounded-md px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm tabular-nums"
          />
          <span className="text-sm text-muted">COP = 1 sello</span>
        </div>
        <span className="text-xs text-muted">
          Referencia informativa de cuánto vale cada sello. No cambia cómo se
          otorgan — los sellos los agregas manualmente.
        </span>
        {!valorValido && (
          <span className="text-xs text-red-600">
            Debe ser un entero positivo, o dejarse vacío.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-graphite">
          Estilo del sello
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {TARJETA_ESTILOS.map((e) => {
            const active = e === estilo
            return (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setEstilo(e)
                  setSavedAt(null)
                }}
                className={
                  'flex flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-xs border transition-colors ' +
                  (active
                    ? 'border-graphite bg-graphite text-white'
                    : 'border-border bg-white text-graphite hover:border-graphite/40')
                }
              >
                <span className="text-base leading-none">{ESTILO_GLYPH[e]}</span>
                {ESTILO_LABEL[e]}
              </button>
            )
          })}
        </div>
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

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            saving ||
            !dirty ||
            !fondoValido ||
            !selloValido ||
            !sizeValido ||
            !valorValido ||
            (fondoTipo === 'gradient' && !fondo2Valido)
          }
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
