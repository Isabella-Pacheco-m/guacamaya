import type { ReactNode } from 'react'
import type { Recompensa, Tenant } from '@/types'
import type { TenantFeatures } from '@/lib/tenant-features'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'

const numFmt = new Intl.NumberFormat('es-CO')

// Debajo de este número no se presume tamaño: un club recién abierto queda
// mejor sin cifra que anunciando "3 miembros".
const MIN_MIEMBROS_VISIBLE = 12

/**
 * Landing pre-login del club (subdominio del tenant, visitante sin sesión).
 *
 * No basta con "Ingresar": quien llega no sabe qué gana entrando. La página
 * responde tres cosas antes del CTA — cómo se ganan puntos, qué se puede
 * canjear y qué más hay adentro — armadas con lo que el negocio ya configuró.
 */
export function TenantWelcome({
  tenant,
  features,
  recompensas,
  miembrosCount,
}: {
  tenant: Tenant
  features: TenantFeatures
  /** Recompensas activas, de la más barata a la más cara. */
  recompensas: Recompensa[]
  miembrosCount: number
}) {
  const extras = extrasDelClub(features)
  const destacadas = recompensas.slice(0, 3)

  return (
    <main className="min-h-screen bg-tenant-halo">
      <TenantTheme color={tenant.color_primario} />

      <div className="px-6 pb-16 max-w-md lg:max-w-3xl mx-auto">
        {/* ══════════ Portada ══════════ */}
        <header className="pt-10 lg:pt-14 text-center">
          {tenant.banner_url ? (
            <div className="relative rounded-lg overflow-hidden shadow-card aspect-[16/9] sm:aspect-[16/7]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tenant.banner_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <p className="absolute left-0 right-0 bottom-4 text-[11px] uppercase tracking-[0.2em] text-white/85">
                Club de miembros
              </p>
            </div>
          ) : (
            <div
              aria-hidden
              className="rounded-lg shadow-card aspect-[16/7]"
              style={{
                background: `radial-gradient(120% 120% at 15% 0%, ${tenant.color_primario}66 0%, transparent 55%), linear-gradient(135deg, #2A2320 0%, #3B2F28 100%)`,
              }}
            />
          )}

          {tenant.logo_url && (
            // Se monta sobre el borde inferior de la portada, como en la home
            // del miembro: da continuidad entre el antes y el después de entrar.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.nombre}
              className="h-20 w-20 rounded-2xl object-contain bg-white p-2 shadow-card ring-1 ring-border mx-auto -mt-10 relative"
            />
          )}

          <h1 className="text-[40px] sm:text-[52px] font-light leading-[1.05] tracking-tight mt-6">
            {tenant.nombre}
          </h1>
          <p className="text-muted text-sm mt-4 max-w-sm mx-auto leading-relaxed">
            Acumula puntos cada vez que compras y cámbialos por recompensas.
            Gratis, sin tarjetas de plástico y desde tu celular.
          </p>

          <a href="/api/auth/login" className="block mt-8">
            <Button className="w-full sm:w-auto sm:px-12">
              Únete al club
            </Button>
          </a>
          {miembrosCount >= MIN_MIEMBROS_VISIBLE && (
            <p className="text-xs text-muted mt-3">
              Ya somos {numFmt.format(miembrosCount)} miembros.
            </p>
          )}
        </header>

        {/* ══════════ Cómo funciona ══════════ */}
        <section className="mt-14">
          <SectionTitle>Cómo funciona</SectionTitle>
          <ol className="mt-5 flex flex-col gap-3">
            <Paso
              n={1}
              titulo="Compras como siempre"
              texto="Dile al negocio que eres del club al pagar."
            />
            <Paso
              n={2}
              titulo={
                tenant.puntos_por_mil === 1
                  ? 'Ganas 1 punto por cada $1.000'
                  : `Ganas ${numFmt.format(tenant.puntos_por_mil)} puntos por cada $1.000`
              }
              texto="Se suman solos a tu cuenta, compra tras compra."
            />
            <Paso
              n={3}
              titulo="Canjeas lo que quieras"
              texto="Elige tu recompensa desde la app y reclámala en el mostrador."
            />
          </ol>
        </section>

        {/* ══════════ Recompensas ══════════ */}
        {destacadas.length > 0 && (
          <section className="mt-12">
            <SectionTitle>Lo que puedes canjear</SectionTitle>
            <ul className="mt-5 flex flex-col gap-3">
              {destacadas.map((r) => (
                <li
                  key={r.id}
                  className="bg-white rounded-2xl shadow-card overflow-hidden flex items-stretch"
                >
                  {r.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imagen_url}
                      alt=""
                      className="w-24 sm:w-28 object-cover shrink-0"
                    />
                  )}
                  <div className="p-4 flex items-center gap-4 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight truncate">
                        {r.nombre}
                      </p>
                      {r.descripcion && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">
                          {r.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-graphite bg-lime/40 rounded-full px-3 py-1 tabular-nums">
                      {numFmt.format(r.costo_puntos)} pts
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {recompensas.length > destacadas.length && (
              <p className="text-xs text-muted mt-3 text-center">
                Y {recompensas.length - destacadas.length}{' '}
                {recompensas.length - destacadas.length === 1
                  ? 'recompensa más adentro'
                  : 'recompensas más adentro'}
                .
              </p>
            )}
          </section>
        )}

        {/* ══════════ Lo demás que hay adentro ══════════ */}
        {extras.length > 0 && (
          <section className="mt-12">
            <SectionTitle>Además, adentro encuentras</SectionTitle>
            <ul className="mt-5 grid sm:grid-cols-2 gap-3">
              {extras.map((e) => (
                <li
                  key={e.titulo}
                  className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-3"
                >
                  <span className="text-electric shrink-0 mt-0.5">{e.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {e.titulo}
                    </p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {e.texto}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ══════════ Cierre ══════════ */}
        <section className="mt-14 text-center">
          <p className="text-lg font-light leading-snug">
            Entrar toma menos de un minuto.
          </p>
          <p className="text-xs text-muted mt-2">
            Solo necesitas tu correo. Sin descargas ni plásticos.
          </p>
          {/* Secundario a propósito: el sol es de una sola acción por
              pantalla y ya lo usa el CTA de la portada. */}
          <a href="/api/auth/login" className="block mt-6">
            <Button variant="secondary" className="w-full sm:w-auto sm:px-12">
              Ingresar
            </Button>
          </a>
        </section>
      </div>
    </main>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] uppercase tracking-wider text-muted">
      {children}
    </h2>
  )
}

function Paso({
  n,
  titulo,
  texto,
}: {
  n: number
  titulo: string
  texto: string
}) {
  return (
    <li className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-4">
      <span className="shrink-0 h-8 w-8 rounded-full bg-graphite text-white text-sm font-medium flex items-center justify-center tabular-nums">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{titulo}</p>
        <p className="text-xs text-muted mt-1 leading-relaxed">{texto}</p>
      </div>
    </li>
  )
}

interface Extra {
  titulo: string
  texto: string
  icon: ReactNode
}

/**
 * Traduce los flags del negocio a lo que el visitante se va a encontrar. Se
 * describe el beneficio, no la feature: nadie entra a un club por un "feed".
 */
function extrasDelClub(f: TenantFeatures): Extra[] {
  const extras: Extra[] = []
  if (f.tarjeta_enabled) {
    extras.push({
      titulo: 'Tarjeta de sellos',
      texto: 'Un sello por compra. Al llenarla, premio.',
      icon: <StampIcon />,
    })
  }
  if (f.cumpleanos_enabled) {
    extras.push({
      titulo: 'Regalo de cumpleaños',
      texto: 'Tu día también se celebra acá.',
      icon: <GiftIcon />,
    })
  }
  if (f.sorteos_enabled) {
    extras.push({
      titulo: 'Sorteos',
      texto: 'Participa por premios solo para miembros.',
      icon: <TicketIcon />,
    })
  }
  if (f.retos_enabled) {
    extras.push({
      titulo: 'Retos',
      texto: 'Cumple metas y gana puntos extra.',
      icon: <TargetIcon />,
    })
  }
  if (f.lanzamientos_enabled) {
    extras.push({
      titulo: 'Lanzamientos',
      texto: 'Entérate de lo nuevo antes que nadie.',
      icon: <SparkIcon />,
    })
  }
  if (f.galeria_enabled) {
    extras.push({
      titulo: 'Galería de la comunidad',
      texto: 'Sube tus fotos y aparece en el club.',
      icon: <CameraIcon />,
    })
  }
  if (f.feed_enabled) {
    extras.push({
      titulo: 'Novedades',
      texto: 'Promos y avisos, sin buscar en redes.',
      icon: <MegaphoneIcon />,
    })
  }
  if (f.ranking_enabled) {
    extras.push({
      titulo: 'Tabla de posiciones',
      texto: 'Mide tus puntos contra el resto del club.',
      icon: <TrophyIcon />,
    })
  }
  return extras
}

// ── Iconos (línea, 1.8px — mismo trazo que los de la home del miembro) ──

const SVG = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  className: 'h-5 w-5',
} as const

function StampIcon() {
  return (
    <svg {...SVG}>
      <circle cx="12" cy="9" r="4.5" />
      <path d="M5 20h14M6.5 17h11" />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg {...SVG}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg {...SVG}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M13 6v2M13 11v2M13 16v2" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg {...SVG}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg {...SVG}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M18 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg {...SVG}>
      <path d="M3 8.5A2 2 0 0 1 5 6.5h1.6l1.2-2h8.4l1.2 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  )
}

function MegaphoneIcon() {
  return (
    <svg {...SVG}>
      <path d="M4 10v4a2 2 0 0 0 2 2h2l8 4V4L8 8H6a2 2 0 0 0-2 2Z" />
      <path d="M19 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg {...SVG}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H5.5a2.5 2.5 0 0 0 2.5 3M16 5.5h2.5a2.5 2.5 0 0 1-2.5 3" />
      <path d="M12 13v4M9 20h6" />
    </svg>
  )
}
