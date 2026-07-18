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

// Cada funcionalidad lleva su punto de color: la marquesina deja de ser una
// tira gris y se vuelve parte de la paleta.
const FEATURES: { label: string; color: string }[] = [
  { label: 'Puntos', color: '#EBBA4F' },
  { label: 'Niveles', color: '#C2603C' },
  { label: 'Recompensas', color: '#D89B7A' },
  { label: 'Tarjeta de sellos', color: '#7E8C5A' },
  { label: 'Sorteos', color: '#EBBA4F' },
  { label: 'Retos', color: '#C2603C' },
  { label: 'Galería', color: '#D89B7A' },
  { label: 'Lanzamientos', color: '#7E8C5A' },
  { label: 'Notas', color: '#EBBA4F' },
  { label: 'Cumpleaños', color: '#C2603C' },
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
            {/* Plana a propósito: sin halos ni degradados. El contraste lo pone
                el color sólido contra el crema de la página. */}
            <div className="relative rounded-[28px] bg-graphite text-white p-6 ring-1 ring-graphite/20 shadow-[0_16px_40px_-24px_rgba(42,35,32,0.5)]">
              {/* Selector de cara: el mensaje es que hay más que sellos */}
              <div className="relative flex gap-1 p-1 rounded-full bg-white/[0.06] mb-7">
                {(['puntos', 'comunidad'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCara(c)}
                    className={
                      'flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors ' +
                      (cara === c
                        ? 'bg-lime text-graphite'
                        : 'text-white/55 hover:text-white')
                    }
                  >
                    {c === 'puntos' ? 'Puntos y premios' : 'Comunidad'}
                  </button>
                ))}
              </div>

              {/* Altura fija: las dos caras miden lo mismo, así la tarjeta no
                  salta de tamaño al alternar entre Puntos y Comunidad. */}
              {cara === 'puntos' ? (
                <div className="relative min-h-[430px] flex flex-col">
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

                  {/* Lista con hairlines en vez de cajas rellenas: más limpia
                      y deja respirar la tarjeta. */}
                  <div className="mb-7 flex-1 divide-y divide-white/[0.08] border-y border-white/[0.08]">
                    {RECOMPENSAS.map((r) => {
                      const ok = puntos >= r.costo
                      return (
                        <div
                          key={r.nombre}
                          className="flex items-center justify-between py-3 text-sm"
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={
                                'grid place-items-center h-[18px] w-[18px] rounded-full text-[10px] transition-colors ' +
                                (ok
                                  ? 'bg-lime text-graphite'
                                  : 'border border-white/20 text-transparent')
                              }
                            >
                              ✓
                            </span>
                            <span className={ok ? 'text-white' : 'text-white/40'}>
                              {r.nombre}
                            </span>
                          </span>
                          <span className="tabular-nums text-xs text-white/35">
                            {nf.format(r.costo)}
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
                <div className="relative min-h-[430px] flex flex-col">
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

                  <p className="text-[13px] text-white/70 leading-relaxed mt-auto pt-5">
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
      <section className="py-7 border-y border-border/70 bg-white/40 overflow-hidden marquee-fade">
        <div className="flex w-max animate-marquee">
          {/* Duplicado: permite el bucle sin costura (ver @keyframes marquee) */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
              {FEATURES.map((f) => (
                <span
                  key={`${copy}-${f.label}`}
                  className="mx-2 inline-flex items-center gap-2.5 whitespace-nowrap text-sm font-medium text-graphite/80 bg-white border border-border rounded-full pl-3.5 pr-5 py-2"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: f.color }}
                  />
                  {f.label}
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
            {/* El desfase editorial se aplica al ARTICLE completo, no por
                separado a imagen y texto: así la distancia imagen→texto es
                idéntica en las tres tarjetas. */}
            {PILARES.map((p, i) => (
              <article
                key={p.src}
                className={'flex flex-col ' + (i === 1 ? 'sm:mt-12' : '')}
              >
                <div className="relative overflow-hidden rounded-lg ring-1 ring-graphite/[0.06] shadow-card mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    className="h-full w-full object-cover aspect-[5/4] transition-transform duration-700 hover:scale-[1.04]"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-graphite bg-lime rounded-full px-3 py-1.5">
                    {p.kicker}
                  </span>
                </div>
                <h3 className="text-xl font-medium leading-tight tracking-tight mb-2">
                  {p.titulo}
                </h3>
                <p className="text-[15px] text-muted leading-relaxed">
                  {p.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ Cierre ══════════ */}
      <section className="px-6 pb-24">
        {/* Es una postal de papel, no un banner: fondo crema plano (sin
            degradados), borde visible, sello de correo y la guacamaya de la
            casa. El tono habla de tú a tú con quien atiende el negocio. */}
        <div className="max-w-3xl mx-auto relative">
          <div className="relative rounded-lg bg-white border border-border shadow-[0_18px_50px_-24px_rgba(42,35,32,0.35)] overflow-hidden">
            {/* Franja superior tipo postal */}
            <div className="flex">
              {['#EBBA4F', '#C2603C', '#D89B7A', '#2A2320'].map((c) => (
                <span key={c} className="h-1.5 flex-1" style={{ background: c }} />
              ))}
            </div>

            <div className="relative px-7 sm:px-12 py-12 sm:py-14">
              {/* Sello de correo, arriba a la derecha */}
              <div className="absolute top-8 right-7 sm:right-12 hidden sm:block">
                <div className="w-[86px] rotate-6 bg-surface border-2 border-dashed border-border rounded-[4px] p-1.5 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/guacamaya-trazo.png"
                    alt=""
                    className="h-12 w-auto mx-auto opacity-80"
                  />
                  <p className="text-[7px] uppercase tracking-[0.14em] text-muted mt-1 leading-tight">
                    Guacamaya
                    <br />
                    Colombia
                  </p>
                </div>
              </div>

              {/* Guacamaya en vuelo con su estela: el guiño de correo aéreo que
                  ata la postal con la marca. Decorativa, se oculta en móvil. */}
              <div
                aria-hidden
                className="pointer-events-none absolute right-6 bottom-4 hidden lg:block w-[230px]"
              >
                <svg
                  viewBox="0 0 220 90"
                  fill="none"
                  className="absolute -left-24 top-8 w-[190px] text-electric/50"
                >
                  <path
                    d="M2 76C40 76 52 14 96 14c30 0 40 40 74 40"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="1 9"
                  />
                </svg>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/guacamaya-volando.png"
                  alt=""
                  className="relative w-[130px] h-auto opacity-90 -rotate-6"
                />
              </div>

              <p className="text-[11px] uppercase tracking-[0.2em] text-electric mb-5">
                Para quien abre cada mañana
              </p>

              <h2 className="text-[30px] sm:text-[40px] font-light leading-[1.08] tracking-tight mb-5 max-w-xl">
                Tú ya sabes quién es
                <br />
                cliente de la casa.
                <br />
                <span className="relative inline-block mt-1">
                  <span className="relative z-10">Ahora tu negocio también.</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 h-3 -z-0 rounded-full bg-lime/60"
                  />
                </span>
              </h2>

              <p className="text-muted text-[15px] leading-relaxed max-w-lg mb-8">
                No es una app más: es tu club, en{' '}
                <span className="font-mono text-graphite">
                  tunegocio.guacamaya.net
                </span>
                , con tu logo arriba y tu gente adentro. El nuestro no aparece
                por ningún lado.
              </p>

              {/* lg:pr-64 reserva el carril de la guacamaya en vuelo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:pr-64">
                <a href="/api/auth/login">
                  <Button className="px-10">Ingresar</Button>
                </a>
                <p className="text-[13px] text-muted">
                  ¿Ya tienes club? Entra con el correo de tu negocio.
                </p>
              </div>
            </div>

            {/* Pie perforado, como el borde de un tiquete */}
            <div className="border-t border-dashed border-border px-7 sm:px-12 py-4 flex flex-wrap items-center gap-x-5 gap-y-1">
              {['Puntos', 'Sellos', 'Comunidad', 'Retos', 'Galería', 'Sorteos'].map(
                (w) => (
                  <span
                    key={w}
                    className="text-[11px] uppercase tracking-[0.16em] text-muted"
                  >
                    {w}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
