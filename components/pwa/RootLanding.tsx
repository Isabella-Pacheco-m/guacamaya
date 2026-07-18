'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

// Landing del apex (guacamaya.net): pitch + demo interactiva de lo que vive el
// cliente. La demo tiene dos caras a propósito — puntos Y comunidad — porque el
// mensaje central es que fidelizar no se agota en una tarjeta de sellos.

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
  'Notas',
  'Cumpleaños',
]

// Cada foto ilustra una capacidad concreta — no son decoración.
const PILARES = [
  {
    src: '/img/barista.jpg',
    alt: 'Barista entregando un pedido a una clienta habitual',
    kicker: 'Reconoce',
    titulo: 'Sabes quién vuelve',
    texto:
      'Cada compra queda ligada a una persona: quién viene, cada cuánto y qué se lleva. Sin tarjetas de cartón ni cuadernos.',
  },
  {
    src: '/img/tendera.jpg',
    alt: 'Dueñas de una tienda revisando su comunidad en el celular',
    kicker: 'Conversa',
    titulo: 'Tu comunidad, no una lista de correos',
    texto:
      'Notas del día, novedades, fotos de tus clientes y retos. La relación se mantiene viva entre una visita y la siguiente.',
  },
  {
    src: '/img/mercado.jpg',
    alt: 'Dueña de un mercado local en su tienda',
    kicker: 'Premia',
    titulo: 'Fideliza sin regalar margen',
    texto:
      'Puntos, sellos, sorteos y lanzamientos exclusivos. Das motivos para volver sin vivir a punta de descuentos.',
  },
]

// Cuenta animada del número de puntos (ease-out cúbico).
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
  const [cara, setCara] = useState<'puntos' | 'comunidad'>('puntos')
  const display = useCountUp(puntos)

  const nivel = nivelDe(puntos)
  const { from, to, next } = tramo(puntos)
  const pct = next ? Math.min(100, ((puntos - from) / (to - from)) * 100) : 100
  const faltan = next ? to - puntos : 0
  const maxed = next === null

  const simularCompra = useCallback(() => {
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
    <main className="relative min-h-screen bg-tenant-halo bg-paper">
      {/* ══════════ Hero ══════════ */}
      <section className="px-6 pt-14 sm:pt-16 pb-14">
        <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-3 -z-0 rounded-full bg-lime/60"
                />
              </span>
              .
            </h1>

            <p className="text-muted text-[15px] leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Dale a tu negocio un club con tu propia marca. Tus clientes
              acumulan puntos, entran a tu comunidad y encuentran motivos para
              volver — todo en una app que instalan en su celular.
            </p>

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

          {/* ── Demo de dos caras ── */}
          <div className="w-full max-w-sm mx-auto">
            <div className="relative rounded-[28px] bg-graphite text-white p-6 shadow-[0_20px_60px_-20px_rgba(42,35,32,0.55)] overflow-hidden">
              <div
                aria-hidden
                className="absolute -top-20 -right-16 h-52 w-52 rounded-full opacity-25 blur-3xl"
                style={{ background: 'var(--color-lime, #EBBA4F)' }}
              />

              {/* Selector de cara: el mensaje es que hay más que sellos */}
              <div className="relative flex gap-1 p-1 rounded-full bg-white/[0.07] mb-6">
                {(['puntos', 'comunidad'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCara(c)}
                    className={
                      'flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors ' +
                      (cara === c
                        ? 'bg-lime text-graphite'
                        : 'text-white/60 hover:text-white')
                    }
                  >
                    {c === 'puntos' ? 'Puntos y premios' : 'Comunidad'}
                  </button>
                ))}
              </div>

              {cara === 'puntos' ? (
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Tu tarjeta
                    </span>
                    <span
                      className={
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
                        (nivel === 'ORO'
                          ? 'bg-lime text-graphite'
                          : 'bg-white/10 text-lime')
                      }
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

                  <div className="mt-5 mb-6">
                    <div className="flex justify-between text-[11px] text-white/45 mb-2">
                      <span>{maxed ? 'Nivel máximo' : `Camino a ${next}`}</span>
                      <span className="tabular-nums">
                        {maxed ? '✦' : `faltan ${nf.format(faltan)}`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-lime transition-[width] duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    {RECOMPENSAS.map((r) => {
                      const ok = puntos >= r.costo
                      return (
                        <div
                          key={r.nombre}
                          className={
                            'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ' +
                            (ok ? 'bg-white/10' : 'bg-white/[0.03]')
                          }
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={
                                'grid place-items-center h-5 w-5 rounded-full text-[11px] transition-colors ' +
                                (ok
                                  ? 'bg-lime text-graphite'
                                  : 'bg-white/10 text-white/40')
                              }
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
                      className="w-full rounded-full px-6 py-3 text-sm font-medium bg-lime text-graphite hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      Simular compra
                    </button>
                  )}

                  <p className="text-center text-[11px] text-white/35 mt-3">
                    Demo · así ve el cliente su progreso
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Su comunidad
                  </span>

                  {/* Nota post-it de la marca */}
                  <div
                    className="mt-4 rounded-xl p-3.5 -rotate-1 shadow-lg"
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      color: '#7C5E10',
                    }}
                  >
                    <p className="text-[13px] leading-snug">
                      Hoy horneamos pan de masa madre. Sale a las 4 🥖
                    </p>
                    <p className="text-[10px] mt-2 opacity-70">hoy</p>
                  </div>

                  {/* Polaroid de un cliente */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="bg-white p-1.5 pb-4 rounded-[3px] rotate-2 shadow-lg shrink-0">
                      <div className="h-16 w-16 rounded-[2px] bg-gradient-to-br from-[#C2603C] to-[#EBBA4F]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/90 leading-snug">
                        Tus clientes suben fotos
                      </p>
                      <p className="text-[11px] text-white/45 mt-0.5">
                        y ganan puntos por hacerlo
                      </p>
                    </div>
                  </div>

                  {/* Reto activo */}
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.07] px-3 py-2.5">
                    <span className="grid place-items-center h-8 w-8 rounded-full bg-lime/25 text-lime shrink-0 text-sm">
                      ★
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/90 truncate">
                        Reto: ven 3 veces este mes
                      </p>
                      <p className="text-[11px] text-white/45">+300 pts</p>
                    </div>
                  </div>

                  <p className="text-[13px] text-white/70 leading-relaxed mt-5">
                    Una tarjeta de sellos premia la compra.{' '}
                    <span className="text-lime">Una comunidad crea el vínculo</span>{' '}
                    que hace que vuelvan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ Marquesina de funcionalidades ══════════ */}
      <section className="py-6 border-y border-border/70 bg-white/40 overflow-hidden">
        <div className="flex w-max animate-marquee">
          {/* Duplicado: permite el bucle sin costura (ver @keyframes marquee) */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
              {FEATURES.map((f) => (
                <span
                  key={`${copy}-${f}`}
                  className="mx-2 whitespace-nowrap text-sm font-medium text-graphite/75 bg-white border border-border rounded-full px-5 py-2"
                >
                  {f}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ Pilares con foto ══════════ */}
      <section className="px-6 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-electric mb-3">
              Hecho para negocios de barrio
            </p>
            <h2 className="text-[30px] sm:text-[38px] font-light leading-[1.1] tracking-tight">
              La gente no vuelve por los puntos.
              <br />
              Vuelve por quien está detrás del mostrador.
            </h2>
          </div>

          <div className="grid gap-8 sm:gap-6 sm:grid-cols-3">
            {PILARES.map((p, i) => (
              <article key={p.src} className="flex flex-col">
                <div
                  className={
                    'relative overflow-hidden rounded-lg ring-1 ring-graphite/[0.06] shadow-card mb-5 ' +
                    // Alturas alternas: ritmo editorial en vez de tres cajas iguales.
                    (i === 1 ? 'sm:mt-10' : '')
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    className="h-full w-full object-cover aspect-[4/5] transition-transform duration-700 hover:scale-[1.04]"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-graphite bg-lime rounded-full px-3 py-1.5">
                    {p.kicker}
                  </span>
                </div>
                <div className={i === 1 ? 'sm:mt-10' : ''}>
                  <h3 className="text-xl font-medium leading-tight tracking-tight mb-2">
                    {p.titulo}
                  </h3>
                  <p className="text-[15px] text-muted leading-relaxed">
                    {p.texto}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ Cierre ══════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto rounded-lg bg-graphite text-white px-8 py-14 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ background: 'var(--color-lime, #EBBA4F)' }}
          />
          <div className="relative">
            <h2 className="text-[28px] sm:text-[36px] font-light leading-tight tracking-tight mb-4">
              Tu club, tu marca, tu subdominio.
            </h2>
            <p className="text-white/60 text-[15px] leading-relaxed max-w-md mx-auto mb-8">
              Tus clientes lo instalan en su celular y entran con tu nombre
              arriba — no con el nuestro.
            </p>
            <a href="/api/auth/login" className="inline-block">
              <Button className="px-10">Ingresar</Button>
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
