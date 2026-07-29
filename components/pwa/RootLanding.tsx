'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import ClickSpark from '@/components/reactbits/ClickSpark'
import BubbleMenu, { type BubbleMenuItem } from '@/components/reactbits/BubbleMenu'
import CardSwap, { Card } from '@/components/reactbits/CardSwap'
import Stack from '@/components/reactbits/Stack'

// Landing del apex (guacamaya.net) — rediseño juvenil y enfocado en ventas.
// Fondo claro (blanco papel), tipografía Manrope con pesos fuertes en display,
// micro-interacciones (ClickSpark), header de burbujas (BubbleMenu) y
// secciones: soluciones (CardSwap), por qué Guacamaya, propuesta de valor
// (Stack de memes), pricing y contacto por WhatsApp.

// ── Paleta de la marca ──
const ESPRESSO = '#2A2320'
const SOL = '#EBBA4F'
const TERRACOTA = '#C2603C'
const ARCILLA = '#D89B7A'
const OLIVA = '#55603A'
const PAPEL = '#FCFAF6'

// Tintes lavados para chips (fondo/borde/texto).
type Tinte = { bg: string; border: string; text: string }
const T_SOL: Tinte = { bg: '#FBEFD2', border: '#F2DFAC', text: '#7A5B12' }
const T_TERRA: Tinte = { bg: '#F8E3DA', border: '#EFCBBB', text: '#8E3F20' }
const T_ARCILLA: Tinte = { bg: '#F7E6DC', border: '#EDD0C0', text: '#8A503A' }
const T_OLIVA: Tinte = { bg: '#EDEFDF', border: '#DCE0C4', text: '#55603A' }

const WHATSAPP_URL =
  'https://wa.me/573151200399?text=' +
  encodeURIComponent(
    'Hola 👋 Quiero crear el club de miembros de mi negocio con Guacamaya.'
  )

// Sticker flotante del hero: el wrapper posiciona y entra con fadeup; el
// inner flota en bucle. El emoji va sobre una moneda blanca para que
// contraste con cualquier fondo.
function HeroSticker({
  pos,
  look,
  emoji,
  delay,
  float,
  bg,
  children,
}: {
  pos: string
  look: string
  emoji: string
  delay: string
  float: string
  bg?: string
  children: React.ReactNode
}) {
  return (
    <span aria-hidden className={`hero-in absolute ${pos}`} style={{ animationDelay: delay }}>
      <span
        className={`inline-flex items-center gap-2.5 rounded-full pl-2 pr-6 py-2 text-base font-bold shadow-card ${float} ${look}`}
        style={bg ? { background: bg } : undefined}
      >
        <span className="grid place-items-center h-10 w-10 rounded-full bg-white shadow-sm text-[22px] leading-none">
          {emoji}
        </span>
        {children}
      </span>
    </span>
  )
}

// ── Header (BubbleMenu) ──
const MENU_ITEMS: BubbleMenuItem[] = [
  {
    label: 'soluciones',
    href: '#soluciones',
    rotation: -8,
    hoverStyles: { bgColor: SOL, textColor: ESPRESSO },
  },
  {
    label: 'por qué',
    href: '#por-que',
    rotation: 8,
    hoverStyles: { bgColor: TERRACOTA, textColor: PAPEL },
  },
  {
    label: 'precio',
    href: '#precio',
    rotation: 8,
    hoverStyles: { bgColor: ARCILLA, textColor: ESPRESSO },
  },
  {
    label: 'contacto',
    href: '#contacto',
    rotation: -8,
    hoverStyles: { bgColor: OLIVA, textColor: PAPEL },
  },
  {
    label: 'ingresar',
    href: '/api/auth/login',
    rotation: 8,
    hoverStyles: { bgColor: ESPRESSO, textColor: SOL },
  },
]

// ── Marquesina de funcionalidades ──
const FEATURES: { label: string; color: Tinte }[] = [
  { label: '📱 PWA instalable', color: T_SOL },
  { label: '⭐ Puntos y niveles', color: T_TERRA },
  { label: '🎁 Recompensas', color: T_ARCILLA },
  { label: '🎟️ Tarjeta de sellos', color: T_OLIVA },
  { label: '💬 Comunidad', color: T_SOL },
  { label: '🎉 Sorteos', color: T_TERRA },
  { label: '🏆 Retos', color: T_ARCILLA },
  { label: '📸 Galería', color: T_OLIVA },
  { label: '🚀 Lanzamientos', color: T_SOL },
  { label: '📝 Notas', color: T_TERRA },
  { label: '🎂 Cumpleaños', color: T_ARCILLA },
  { label: '🥇 Ranking', color: T_OLIVA },
]

// ── Sección soluciones (CardSwap) ──
const SOLUCIONES = [
  'PWA instalable con tu subdominio: tunegocio.guacamaya.net',
  'Tarjeta de fidelización digital — sellos que nadie pierde',
  'Puntos por compra, niveles Bronce / Plata / Oro y recompensas',
  'Comunidad con feed, notas del día y galería de fotos',
  'Sorteos, retos y metas que activan a tus clientes',
  'Regalos automáticos de cumpleaños y ranking de miembros',
]

const CARDS_SOLUCIONES: {
  emoji: string
  titulo: string
  texto: string
  chip: string
  bg: string
  color: string
  chipBg: string
}[] = [
  {
    emoji: '📱',
    titulo: 'Tu propia app',
    texto:
      'Una PWA instalable con tu logo y tus colores. Sin tiendas de apps ni desarrollos costosos.',
    chip: 'tunegocio.guacamaya.net',
    bg: ESPRESSO,
    color: PAPEL,
    chipBg: 'rgba(235,186,79,0.25)',
  },
  {
    emoji: '🎟️',
    titulo: 'Tarjeta de fidelización',
    texto:
      'Sellos digitales por compra. Se guarda en el celular, no en el bolsillo del otro pantalón.',
    chip: 'Adiós al cartón',
    bg: SOL,
    color: ESPRESSO,
    chipBg: 'rgba(42,35,32,0.10)',
  },
  {
    emoji: '⭐',
    titulo: 'Puntos y niveles',
    texto:
      'Cada compra suma. Bronce, Plata y Oro con beneficios que premian a los que más vuelven.',
    chip: 'Vuelven por más',
    bg: TERRACOTA,
    color: PAPEL,
    chipBg: 'rgba(252,250,246,0.18)',
  },
  {
    emoji: '💬',
    titulo: 'Comunidad',
    texto:
      'Feed, notas del día, galería de fotos de tus clientes y retos. Relación viva entre visitas.',
    chip: 'No es una lista de correos',
    bg: ARCILLA,
    color: ESPRESSO,
    chipBg: 'rgba(42,35,32,0.10)',
  },
  {
    emoji: '🎉',
    titulo: 'Sorteos y retos',
    texto:
      'Metas mensuales, sorteos con evidencia y premios. Motivos concretos para volver esta semana.',
    chip: 'Siempre pasa algo',
    bg: OLIVA,
    color: PAPEL,
    chipBg: 'rgba(252,250,246,0.16)',
  },
  {
    emoji: '🎂',
    titulo: 'Cumpleaños',
    texto:
      'Puntos de regalo automáticos el mes del cumpleaños. El detalle que nadie olvida.',
    chip: 'Automático',
    bg: PAPEL,
    color: ESPRESSO,
    chipBg: 'rgba(235,186,79,0.35)',
  },
]

// ── Por qué las marcas eligen Guacamaya ──
const RAZONES: { titulo: string; texto: string; tinte: Tinte }[] = [
  {
    titulo: 'Conectar con tus clientes no tiene que ser costoso',
    texto:
      'Fidelizar no es sinónimo de regalar margen. Con puntos, niveles y beneficios bien diseñados, das motivos reales para volver sin vivir a punta de descuentos.',
    tinte: T_SOL,
  },
  {
    titulo: 'Aprendemos de las mejores para diseñarte algo que funcione',
    texto:
      'Analizamos la estrategia de miles de marcas que ya conoces — qué premian, qué comunican, qué hace que la gente vuelva — y usamos eso para construir soluciones que realmente le sirvan a tu negocio, no una plantilla genérica.',
    tinte: T_TERRA,
  },
  {
    titulo: 'Soporte 100% humano',
    texto:
      'Nada de bots ni tickets que nadie responde. Un equipo real te ayuda a crear tu club desde cero o a integrar Guacamaya con las herramientas que ya usas.',
    tinte: T_OLIVA,
  },
]

// ── Pricing ──
const PRICING_INCLUYE = [
  'Todas las funciones del ecosistema, sin planes escondidos',
  'Tu subdominio propio con tu logo y tus colores',
  'Clientes y miembros ilimitados',
  'Soporte humano para montar tu club desde cero',
  'Sin permanencia — te desuscribes cuando quieras',
]

export function RootLanding({
  sessionUnlinked,
  errorMsg,
}: {
  sessionUnlinked: boolean
  errorMsg: string | null
}) {
  return (
    <ClickSpark
      sparkColor={SOL}
      sparkSize={11}
      sparkRadius={20}
      sparkCount={8}
      duration={450}
    >
      <main className="relative min-h-screen overflow-x-clip bg-white text-graphite">
        {/* ══════════ Header — BubbleMenu ══════════ */}
        <BubbleMenu
          logo={
            <Image
              src="/logo-light.png"
              alt="Guacamaya"
              width={180}
              height={77}
              priority
              className="h-9 md:h-10 w-auto"
            />
          }
          useFixedPosition
          menuBg={PAPEL}
          menuContentColor={ESPRESSO}
          items={MENU_ITEMS}
        />

        {/* ══════════ Hero ══════════ */}
        <section className="relative overflow-hidden px-6 pt-44 sm:pt-52 pb-28 sm:pb-36 text-center">
          {/* Manchas de color difuminadas: aire y profundidad sin ensuciar */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-lime/25 blur-3xl" />
            <div
              className="absolute top-10 -right-28 h-[340px] w-[340px] rounded-full blur-3xl"
              style={{ background: 'rgba(194,96,60,0.16)' }}
            />
            <div
              className="absolute -bottom-36 left-1/3 h-[360px] w-[360px] rounded-full blur-3xl"
              style={{ background: 'rgba(216,155,122,0.22)' }}
            />
          </div>

          {/* Stickers flotantes — emoji en moneda blanca para que contraste */}
          <HeroSticker
            pos="hidden lg:block left-[9%] top-44"
            look="-rotate-6 bg-lime text-graphite"
            emoji="✨"
            delay="0.45s"
            float="animate-[floaty_5s_ease-in-out_infinite]"
          >
            +120 pts
          </HeroSticker>
          <HeroSticker
            pos="hidden lg:block right-[9%] top-40"
            look="rotate-6 text-white"
            emoji="🎁"
            delay="0.55s"
            float="animate-[floaty_6s_ease-in-out_infinite_reverse]"
            bg={TERRACOTA}
          >
            Canje listo
          </HeroSticker>
          <HeroSticker
            pos="hidden lg:block left-[15%] bottom-14"
            look="rotate-3 border border-border bg-white text-graphite"
            emoji="🏆"
            delay="0.65s"
            float="animate-[floaty_7s_ease-in-out_infinite]"
          >
            Nivel ORO
          </HeroSticker>
          <HeroSticker
            pos="hidden lg:block right-[14%] bottom-20"
            look="-rotate-3 text-graphite"
            emoji="🎟️"
            delay="0.75s"
            float="animate-[floaty_5.5s_ease-in-out_infinite_reverse]"
            bg={ARCILLA}
          >
            +1 sello
          </HeroSticker>
          <HeroSticker
            pos="hidden xl:block left-[16%] top-24"
            look="rotate-2 border border-border bg-white text-graphite"
            emoji="🎂"
            delay="0.85s"
            float="animate-[floaty_6.5s_ease-in-out_infinite]"
          >
            Regalo de cumple
          </HeroSticker>

          <div className="max-w-3xl mx-auto">
            <p
              className="hero-in inline-flex items-center gap-2.5 text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold text-graphite bg-lime/40 border border-lime rounded-full pl-1.5 pr-5 py-1.5 mb-7"
            >
              <span className="grid place-items-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-[18px] sm:text-[20px] leading-none tracking-normal">
                🦜
              </span>
              Club de miembros · con tu marca
            </p>

            <h1
              className="hero-in text-[44px] sm:text-[64px] font-extrabold leading-[1.0] tracking-tight mb-6"
              style={{ animationDelay: '0.08s' }}
            >
              Convierte compras en{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10">clientes que vuelven</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-2 h-4 -z-0 rounded-full bg-lime/70"
                />
              </span>
              .
            </h1>

            <p
              className="hero-in text-muted text-[17px] leading-relaxed max-w-xl mx-auto mb-9"
              style={{ animationDelay: '0.16s' }}
            >
              Puntos, niveles, recompensas y una comunidad que se siente
              genuina — en una app con tu logo que tus clientes instalan en su
              celular. Vender más no es descontar más: es dar motivos para
              volver.
            </p>

            {errorMsg && (
              <div className="mb-7 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3 text-left max-w-md mx-auto">
                {errorMsg}
              </div>
            )}

            {sessionUnlinked ? (
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
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
              <div
                className="hero-in flex flex-col sm:flex-row gap-3 items-center justify-center"
                style={{ animationDelay: '0.24s' }}
              >
                <a href="/suscribirse" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto px-9 py-4 text-base font-extrabold">
                    Crea tu club · $35.000/mes
                  </Button>
                </a>
                <a href="#soluciones" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto px-9 py-4 text-base font-bold"
                  >
                    Ver cómo funciona ↓
                  </Button>
                </a>
              </div>
            )}

            <p
              className="hero-in text-xs text-muted mt-5"
              style={{ animationDelay: '0.32s' }}
            >
              Sin permanencia · montaje asistido por un equipo real
            </p>
          </div>
        </section>

        {/* ══════════ Marquesina ══════════ */}
        <section className="py-6 border-y border-border/70 overflow-hidden marquee-fade bg-surface/60">
          <div className="flex w-max animate-marquee">
            {[0, 1, 2, 3].map((copy) => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy > 0}>
                {FEATURES.map((f) => (
                  <span
                    key={`${copy}-${f.label}`}
                    className="mx-1.5 inline-flex items-center whitespace-nowrap text-sm font-bold rounded-full px-5 py-2 border"
                    style={{
                      color: f.color.text,
                      background: f.color.bg,
                      borderColor: f.color.border,
                    }}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ Soluciones — CardSwap ══════════ */}
        <section id="soluciones" className="px-6 py-20 sm:py-24 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <div
              className="relative overflow-hidden rounded-[32px] text-white px-7 py-12 sm:px-12 sm:py-16 lg:min-h-[560px]"
              style={{ background: ESPRESSO }}
            >
              <div className="max-w-md relative z-10">
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-lime mb-4">
                  Soluciones
                </p>
                <h2 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.05] tracking-tight mb-5">
                  Todo tu ecosistema de fidelización, en un solo lugar.
                </h2>
                <p className="text-white/60 text-[15px] leading-relaxed mb-8">
                  No es una tarjeta de puntos más. Es tu propia app de
                  membresías, con todo lo que un club necesita para vender más.
                </p>

                <ul className="flex flex-col gap-3">
                  {SOLUCIONES.map((s) => (
                    <li key={s} className="flex items-start gap-3 text-[15px]">
                      <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-lime text-graphite text-[10px] font-bold mt-1 shrink-0">
                        ✓
                      </span>
                      <span className="text-white/85">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pila de tarjetas: rota sola y se pausa al pasar el mouse */}
              <div className="relative h-[380px] sm:h-[420px] mt-8 lg:mt-0 lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 lg:h-auto">
                <CardSwap
                  width={400}
                  height={310}
                  cardDistance={55}
                  verticalDistance={62}
                  delay={4200}
                  skewAmount={5}
                  pauseOnHover
                >
                  {CARDS_SOLUCIONES.map((c) => (
                    <Card
                      key={c.titulo}
                      className="p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] border border-white/20"
                      style={{ background: c.bg, color: c.color }}
                    >
                      <span className="text-3xl">{c.emoji}</span>
                      <h3 className="text-2xl font-extrabold tracking-tight mt-3 mb-2">
                        {c.titulo}
                      </h3>
                      <p className="text-[14px] leading-relaxed opacity-80 mb-4">
                        {c.texto}
                      </p>
                      <span
                        className="inline-flex rounded-full px-3 py-1.5 text-xs font-bold"
                        style={{ background: c.chipBg }}
                      >
                        {c.chip}
                      </span>
                    </Card>
                  ))}
                </CardSwap>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ Por qué las marcas eligen Guacamaya ══════════ */}
        <section id="por-que" className="px-6 pb-20 sm:pb-24 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-10">
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-electric mb-3">
                Por qué Guacamaya
              </p>
              <h2 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.05] tracking-tight">
                Por qué las marcas eligen Guacamaya
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {RAZONES.map((r, i) => (
                <article
                  key={r.titulo}
                  className="group rounded-[24px] border p-7 transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.5deg]"
                  style={{
                    background: r.tinte.bg,
                    borderColor: r.tinte.border,
                  }}
                >
                  {/* Numeral editorial: solo contorno, sin relleno. */}
                  <span
                    aria-hidden
                    className="block text-[76px] font-extrabold leading-none tracking-[-0.05em] select-none mb-4 origin-left transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-2"
                    style={{
                      WebkitTextStroke: `2px ${r.tinte.text}`,
                      color: 'transparent',
                    }}
                  >
                    0{i + 1}
                  </span>
                  <h3
                    className="text-xl font-extrabold leading-snug tracking-tight mb-3"
                    style={{ color: r.tinte.text }}
                  >
                    {r.titulo}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-graphite/75">
                    {r.texto}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ Propuesta de valor + Stack de memes ══════════ */}
        <section className="px-6 py-20 sm:py-24 bg-surface/70 border-y border-border/60">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-electric mb-3">
                La propuesta
              </p>
              <h2 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.05] tracking-tight mb-6">
                Tus clientes quieren que conectes con ellos.{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">
                    Solo que no de la forma típica.
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 h-3 -z-0 rounded-full bg-lime/60"
                  />
                </span>
              </h2>

              <div className="flex flex-col gap-4 text-[15.5px] leading-relaxed text-graphite/80">
                <p>
                  Ya nadie guarda una tarjeta de cartón. Se pierde, se dobla, se
                  queda en otro pantalón… y con ella se va también la razón para
                  volver.
                </p>
                <p>
                  En Guacamaya creamos un ecosistema de fidelización pensado
                  para acercarte de verdad a tus clientes. Olvídate del cartón
                  que todo el mundo olvida y de quemar presupuesto en descuentos
                  para que la gente no se vaya con la competencia.
                </p>
                <p>
                  En nuestra plataforma vas a encontrar el balance ideal:
                  beneficios que tus clientes sí valoran, y una comunidad que se
                  siente genuina, no una lista de correos que nadie abre. ¿Lo
                  mejor? Te ayudamos a integrarla con tus herramientas actuales.
                </p>
                <p className="font-bold text-graphite">
                  Porque la lealtad no se compra con más descuento. Se construye
                  con una relación que tu cliente quiere seguir teniendo
                  contigo.
                </p>
              </div>
            </div>

            {/* Stack arrastrable — memes de la marca */}
            <div className="justify-self-center">
              <div className="h-[400px] w-[315px] sm:h-[460px] sm:w-[362px]">
                <Stack
                  randomRotation
                  sendToBackOnClick
                  autoplay
                  autoplayDelay={4000}
                  pauseOnHover
                  sensitivity={150}
                  cards={[1, 2, 3].map((n) => (
                    <Image
                      key={n}
                      src={`/img/memes/${n}.png`}
                      alt="Así se sienten tus clientes con su club"
                      width={750}
                      height={950}
                      className="w-full h-full object-cover pointer-events-none select-none"
                    />
                  ))}
                />
              </div>
              <p className="text-center text-xs text-muted mt-5">
                Arrástralas 👆 — así lucirán tus clientes cuando tengas tu club
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ Pricing ══════════ */}
        <section id="precio" className="px-6 py-20 sm:py-24 scroll-mt-24">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-electric mb-3">
              Precio
            </p>
            <h2 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.05] tracking-tight mb-4">
              Un precio simple. Todo incluido.
            </h2>
            <p className="text-muted text-[15px] max-w-md mx-auto mb-10">
              Menos de lo que cuesta imprimir tarjetas de cartón que terminan
              en la lavadora.
            </p>

            <div className="relative max-w-lg mx-auto rounded-[32px] bg-graphite text-white p-8 sm:p-10 text-left shadow-[0_28px_70px_-30px_rgba(42,35,32,0.6)]">
              <span className="absolute -top-5 right-6 sm:right-8 rotate-3 inline-flex items-center gap-2.5 rounded-full bg-lime pl-2 pr-6 py-2 text-base font-extrabold text-graphite shadow-card">
                <span className="grid place-items-center h-10 w-10 rounded-full bg-white text-[22px] leading-none">
                  ✌️
                </span>
                Sin permanencia
              </span>

              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mb-3">
                Plan único
              </p>
              <div className="flex items-end gap-2 mb-7">
                <span className="text-[56px] font-extrabold leading-none tabular-nums">
                  $35.000
                </span>
                <span className="text-white/55 text-sm mb-2">COP / mes</span>
              </div>

              <ul className="flex flex-col gap-3 mb-8">
                {PRICING_INCLUYE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]">
                    <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-lime text-graphite text-[10px] font-bold mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span className="text-white/85">{item}</span>
                  </li>
                ))}
              </ul>

              <a href="/suscribirse" className="block">
                <Button className="w-full py-4 text-base font-extrabold">
                  Crear mi club ahora
                </Button>
              </a>
              <p className="text-[11px] text-white/40 text-center mt-4">
                Pago seguro con Wompi · pagas y te contactamos para crear tu
                club contigo
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ Contacto ══════════ */}
        <section
          id="contacto"
          className="px-6 py-20 sm:py-24 scroll-mt-24 text-white"
          style={{ background: ESPRESSO }}
        >
          <div className="max-w-3xl mx-auto text-center">
            {/* El trazo del ave es negro: lo quemamos a blanco con el filtro
                (brightness(0) lo vuelve sólido, invert(1) lo pasa a blanco). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/guacamaya-volando.png"
              alt=""
              aria-hidden
              className="mx-auto mb-8 w-28 sm:w-32 h-auto -rotate-3"
              style={{
                filter:
                  'brightness(0) invert(1) drop-shadow(0 14px 34px rgba(252,250,246,0.28))',
              }}
            />

            <h2 className="text-[32px] sm:text-[44px] font-extrabold leading-[1.05] tracking-tight mb-5">
              ¿Listo para darle a tu negocio su propio club?
            </h2>
            <p className="text-white/65 text-[15.5px] leading-relaxed max-w-xl mx-auto mb-10">
              Cuéntanos cómo es tu negocio y te ayudamos a diseñar un club a tu
              medida: con tu marca, tus reglas y el soporte de un equipo real
              detrás.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-full px-9 py-4 text-base font-extrabold text-[#0B3D22] ring-2 ring-white/25 shadow-[0_16px_40px_-14px_rgba(37,211,102,0.7)] transition-all hover:brightness-110 active:scale-[0.98] w-full sm:w-auto"
                style={{ background: '#25D366' }}
              >
                {/* Ícono WhatsApp */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.73-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
                </svg>
                Hablar por WhatsApp
              </a>
              <a href="/suscribirse" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto px-9 py-4 text-base font-extrabold">
                  Crear mi club ya
                </Button>
              </a>
            </div>

            <p className="text-[12px] text-white/40 mt-6">
              +57 315 120 0399 · respondemos personas, no bots
            </p>
          </div>
        </section>

        {/* ══════════ Footer ══════════ */}
        <footer className="px-6 py-8 border-t border-white/10 text-white" style={{ background: ESPRESSO }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Image
              src="/logo-dark.png"
              alt="Guacamaya"
              width={120}
              height={51}
              className="h-7 w-auto"
            />
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/55">
              <a href="#soluciones" className="hover:text-white transition-colors">
                Soluciones
              </a>
              <a href="#precio" className="hover:text-white transition-colors">
                Precio
              </a>
              <a href="/suscribirse" className="hover:text-white transition-colors">
                Crear mi club
              </a>
              <a href="/api/auth/login" className="hover:text-white transition-colors">
                Ingresar
              </a>
            </nav>
            <p className="text-xs text-white/35">
              Hecho en Colombia 🦜 · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </main>
    </ClickSpark>
  )
}
