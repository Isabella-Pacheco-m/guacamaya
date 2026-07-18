'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

// Landing del apex (guacamaya.net): una sola sección con el pitch + una demo
// interactiva de la tarjeta del cliente. La demo simula compras → suma puntos
// → sube de nivel → desbloquea recompensas, que es justo lo que hace la app.

const PLATA = 500
const ORO = 2000

type Nivel = 'BRONCE' | 'PLATA' | 'ORO'

const nf = new Intl.NumberFormat('es-CO')

function nivelDe(p: number): Nivel {
  if (p >= ORO) return 'ORO'
  if (p >= PLATA) return 'PLATA'
  return 'BRONCE'
}

function tramo(p: number): { from: number; to: number; next: Nivel | null } {
  if (p >= ORO) return { from: ORO, to: ORO, next: null }
  if (p >= PLATA) return { from: PLATA, to: ORO, next: 'ORO' }
  return { from: 0, to: PLATA, next: 'PLATA' }
}

const RECOMPENSAS = [
  { nombre: 'Café gratis', costo: 500 },
  { nombre: '2x1 en postres', costo: 1200 },
  { nombre: 'Combo VIP', costo: 2000 },
]

const FEATURES = [
  'Puntos',
  'Niveles',
  'Recompensas',
  'Tarjeta de sellos',
  'Sorteos',
  'Retos',
  'Galería',
  'Lanzamientos',
]

// Fotos de negocios reales — el alma del pitch: gente atendiendo su local.
const FOTOS = [
  { src: '/img/barista.jpg', alt: 'Barista entregando un pedido en su café' },
  { src: '/img/tendera.jpg', alt: 'Dueñas de una tienda revisando su comunidad' },
  { src: '/img/mercado.jpg', alt: 'Dueña de un mercado local en su tienda' },
]

// Cuenta-regresiva animada del número de puntos (ease-out cúbico).
function useCountUp(target: number): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number>()

  useEffect(() => {
    const start = performance.now()
    const from = fromRef.current
    const dur = 650
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  return val
}

const PUNTOS_INICIALES = 240

export function RootLanding({
  sessionUnlinked,
  errorMsg,
}: {
  sessionUnlinked: boolean
  errorMsg: string | null
}) {
  const [puntos, setPuntos] = useState(PUNTOS_INICIALES)
  const [gain, setGain] = useState<{ value: number; key: number } | null>(null)
  const display = useCountUp(puntos)

  const nivel = nivelDe(puntos)
  const { from, to, next } = tramo(puntos)
  const pct = next ? Math.min(100, ((puntos - from) / (to - from)) * 100) : 100
  const faltan = next ? to - puntos : 0
  const maxed = next === null

  const simularCompra = useCallback(() => {
    // Compra aleatoria $20k–$80k · 5 pts por cada $1.000 (igual que un tenant real)
    const monto = (4 + Math.floor(Math.random() * 13)) * 5000
    const ganados = Math.floor(monto / 1000) * 5
    setPuntos((p) => Math.min(ORO + 600, p + ganados))
    setGain({ value: ganados, key: Date.now() })
  }, [])

  const reiniciar = useCallback(() => {
    setPuntos(PUNTOS_INICIALES)
    setGain(null)
  }, [])

  return (
    <main className="relative min-h-screen bg-tenant-halo bg-paper px-6 py-14 sm:py-16">
      <section className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* ── Pitch ── */}
        <div className="text-center lg:text-left">
          <Image
            src="/logo-light.png"
            alt="Guacamaya"
            width={280}
            height={120}
            priority
            className="h-auto w-[210px] mx-auto lg:mx-0 mb-7"
          />

          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-graphite/70 bg-lime/35 border border-lime/50 rounded-full px-3.5 py-1.5 mb-6">
            Club de miembros · marca propia
          </p>

          <h1 className="text-[40px] sm:text-[52px] font-light leading-[1.02] tracking-tight mb-5">
            Convierte cada compra
            <br />
            en una razón para{' '}
            <span className="relative inline-block">
              <span className="relative z-10">volver</span>
              {/* Subrayado pintado a mano — el toque artesanal de la marca. */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 h-3 -z-0 rounded-full bg-lime/60"
              />
            </span>
            .
          </h1>

          <p className="text-muted text-[15px] leading-relaxed mb-7 max-w-md mx-auto lg:mx-0">
            Dale a tu negocio un club de miembros con tu propia marca. Tus
            clientes acumulan puntos, suben de nivel y canjean recompensas —
            todo en una app que instalan en su celular.
          </p>

          <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-9">
            {FEATURES.map((f) => (
              <span
                key={f}
                className="text-xs font-medium text-graphite/70 bg-white border border-border rounded-full px-3 py-1.5 transition-colors hover:border-electric hover:text-electric cursor-default"
              >
                {f}
              </span>
            ))}
          </div>

          {errorMsg && (
            <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3 text-left max-w-md mx-auto lg:mx-0">
              {errorMsg}
            </div>
          )}

          {sessionUnlinked ? (
            <div className="flex flex-col gap-3 max-w-xs mx-auto lg:mx-0">
              <p className="text-sm text-muted">
                Tu cuenta no está vinculada a ningún tenant.
              </p>
              <a href="/api/auth/logout">
                <Button variant="secondary" className="w-full">
                  Cerrar sesión
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center lg:justify-start">
              <a href="/api/auth/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto px-8">Ingresar</Button>
              </a>
              <span className="text-xs text-muted">
                Para administradores y clientes de cada club.
              </span>
            </div>
          )}
        </div>

        {/* ── Demo interactiva: tarjeta del cliente ── */}
        <div className="w-full max-w-sm mx-auto">
          <div className="relative rounded-lg bg-graphite text-white p-7 shadow-[0_8px_40px_rgba(26,26,30,0.18)] overflow-hidden">
            {/* halo de fondo */}
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-20 blur-2xl"
              style={{ background: 'var(--color-lime, #EBBA4F)' }}
            />

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Tu tarjeta
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    nivel === 'ORO'
                      ? 'bg-lime text-graphite'
                      : 'bg-white/10 text-lime'
                  }`}
                >
                  {nivel}
                </span>
              </div>

              <div className="flex items-end gap-2 mb-1">
                <span className="text-[44px] font-light leading-none tabular-nums">
                  {nf.format(display)}
                </span>
                <span className="text-white/50 text-sm mb-1.5">puntos</span>

                {gain && (
                  <span
                    key={gain.key}
                    className="ml-auto text-lime text-sm font-medium animate-[floatup_0.9s_ease-out]"
                  >
                    +{nf.format(gain.value)}
                  </span>
                )}
              </div>

              {/* progreso al siguiente nivel */}
              <div className="mt-5 mb-6">
                <div className="flex justify-between text-[11px] text-white/45 mb-2">
                  <span>{maxed ? 'Nivel máximo' : `Camino a ${next}`}</span>
                  <span className="tabular-nums">
                    {maxed ? '✦' : `faltan ${nf.format(faltan)}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-electric transition-[width] duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* recompensas desbloqueables */}
              <div className="space-y-2 mb-7">
                {RECOMPENSAS.map((r) => {
                  const ok = puntos >= r.costo
                  return (
                    <div
                      key={r.nombre}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        ok ? 'bg-white/10' : 'bg-white/[0.03]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid place-items-center h-5 w-5 rounded-full text-[11px] transition-colors ${
                            ok
                              ? 'bg-lime text-graphite'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {ok ? '✓' : '·'}
                        </span>
                        <span className={ok ? 'text-white' : 'text-white/45'}>
                          {r.nombre}
                        </span>
                      </span>
                      <span className="tabular-nums text-xs text-white/40">
                        {nf.format(r.costo)} pts
                      </span>
                    </div>
                  )
                })}
              </div>

              {maxed ? (
                <button
                  onClick={reiniciar}
                  className="w-full rounded-full px-6 py-3 text-sm font-medium border border-white/20 text-white hover:bg-white/10 transition-colors"
                >
                  Reiniciar demo
                </button>
              ) : (
                <button
                  onClick={simularCompra}
                  className="w-full rounded-full px-6 py-3 text-sm font-medium bg-electric text-white hover:bg-electric/90 active:scale-[0.98] transition-all"
                >
                  Simular compra
                </button>
              )}

              <p className="text-center text-[11px] text-white/35 mt-3">
                Demo · así ve el cliente su progreso
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Negocios de verdad ── */}
      <section className="max-w-6xl w-full mx-auto mt-20 sm:mt-24">
        <div className="text-center max-w-xl mx-auto mb-9">
          <p className="text-[11px] uppercase tracking-[0.2em] text-electric mb-3">
            Hecho para negocios de barrio
          </p>
          <h2 className="text-[28px] sm:text-[34px] font-light leading-tight tracking-tight">
            La gente vuelve por quien está detrás del mostrador.
          </h2>
          <p className="text-muted text-[15px] leading-relaxed mt-3">
            Guacamaya le pone nombre, cara y memoria a esa relación: quién viene,
            cada cuánto y qué se lleva.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {FOTOS.map((f, i) => (
            <figure
              key={f.src}
              className={
                'relative overflow-hidden rounded-lg ring-1 ring-graphite/[0.06] shadow-card ' +
                // La primera ocupa dos columnas en móvil: da ritmo editorial.
                (i === 0 ? 'col-span-2 sm:col-span-1' : '')
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.src}
                alt={f.alt}
                loading="lazy"
                className="h-full w-full object-cover aspect-[4/3] transition-transform duration-700 hover:scale-[1.04]"
              />
            </figure>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/api/auth/login" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-8">Ingresar</Button>
          </a>
          <span className="text-xs text-muted">
            Tu club, tu marca, tu subdominio.
          </span>
        </div>
      </section>
    </main>
  )
}
