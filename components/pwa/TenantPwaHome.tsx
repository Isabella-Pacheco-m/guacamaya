import Link from 'next/link'
import type { ReactNode } from 'react'
import type { FeedPost, Miembro, Tenant } from '@/types'
import type { TenantFeatures } from '@/lib/tenant-features'
import type { TarjetaPremioEstado } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { CumpleanosPrompt } from '@/components/pwa/CumpleanosPrompt'
import { TarjetaCliente } from '@/components/pwa/TarjetaCliente'
import { FeedPostCard } from '@/components/pwa/FeedPostCard'
import { AvatarUploader } from '@/components/pwa/AvatarUploader'
import { NotasBoard } from '@/components/pwa/NotasBoard'
import type { Nota } from '@/lib/notas'

const COP = new Intl.NumberFormat('es-CO')

const NIVEL_PROGRESO: Record<Miembro['nivel'], { siguiente: string | null; meta: number | null }> = {
  BRONCE: { siguiente: 'PLATA', meta: 500 },
  PLATA: { siguiente: 'ORO', meta: 2000 },
  ORO: { siguiente: null, meta: null },
}

export function TenantPwaHome({
  tenant,
  miembro,
  features,
  tarjetaPremios,
  ultimoPost,
  notas,
}: {
  tenant: Tenant
  miembro: Miembro
  features: TenantFeatures
  tarjetaPremios: TarjetaPremioEstado[]
  ultimoPost: FeedPost | null
  notas: Nota[]
}) {
  const progreso = NIVEL_PROGRESO[miembro.nivel]
  const haciaSiguiente =
    progreso.meta != null
      ? Math.min(100, Math.round((miembro.puntos_historicos / progreso.meta) * 100))
      : 100
  const faltan =
    progreso.meta != null ? Math.max(0, progreso.meta - miembro.puntos_historicos) : 0

  return (
    <main className="min-h-screen bg-tenant-halo">
      <TenantTheme color={tenant.color_primario} />

      {/* ── Portada: banner + logo + avatar del miembro ── */}
      <header className="relative">
        <div className="relative h-40 sm:h-52 lg:h-60 w-full overflow-hidden bg-graphite">
          {tenant.banner_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tenant.banner_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/10" />
            </>
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 120% at 15% 0%, ${tenant.color_primario}66 0%, transparent 55%), linear-gradient(135deg, #2A2320 0%, #3B2F28 100%)`,
              }}
            />
          )}

          {/* Logo + nombre sobre la portada */}
          <div className="absolute left-0 right-0 bottom-0 px-6 pb-4 flex items-center gap-3">
            {tenant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.nombre}
                className="h-12 w-12 rounded-xl object-contain bg-white/95 p-1.5 shadow-md ring-1 ring-white/40 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Club de miembros
              </p>
              <p className="text-lg font-medium text-white leading-tight truncate drop-shadow-sm">
                {tenant.nombre}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de identidad del miembro, montada sobre el borde de la portada */}
        <div className="px-6 max-w-md lg:max-w-5xl mx-auto">
          <div className="-mt-8 flex items-end justify-between gap-4">
            <div className="flex items-end gap-3 min-w-0">
              <AvatarUploader
                nombre={miembro.nombre}
                initialUrl={miembro.avatar_url}
                size={72}
              />
              <div className="min-w-0 pb-1">
                <h1 className="text-xl lg:text-2xl font-light leading-tight truncate">
                  Hola, {miembro.nombre.split(' ')[0]}
                </h1>
                <p className="text-xs text-muted truncate">
                  {miembro.email ?? 'Miembro de la comunidad'}
                </p>
              </div>
            </div>
            <div className="pb-1 shrink-0">
              <NivelBadge nivel={miembro.nivel} />
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 pt-6 pb-12 sm:px-8 lg:pb-16 max-w-md lg:max-w-5xl mx-auto">
        <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:items-start">
          <div className="lg:min-w-0">
            <Card padding="lg" className="mb-6">
              <p className="text-[11px] uppercase tracking-wider text-muted">
                Tus puntos
              </p>
              <div className="flex items-baseline gap-2 mt-2 mb-6">
                <span className="text-[64px] lg:text-[80px] font-light leading-none tracking-tight tabular-nums">
                  {COP.format(miembro.puntos_actuales)}
                </span>
                <span className="text-sm text-muted">disponibles</span>
              </div>

              {progreso.siguiente && progreso.meta != null ? (
                <>
                  <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span className="tracking-wide">
                      Hacia{' '}
                      <span className="text-graphite">{progreso.siguiente}</span>
                    </span>
                    <span className="tabular-nums">
                      {COP.format(miembro.puntos_historicos)} /{' '}
                      {COP.format(progreso.meta)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-electric transition-[width] duration-500"
                      style={{ width: `${haciaSiguiente}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Te faltan{' '}
                    <span className="text-graphite tabular-nums">
                      {COP.format(faltan)}
                    </span>{' '}
                    puntos para subir.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted">Estás en el nivel máximo. ✨</p>
              )}
            </Card>

            {features.tarjeta_enabled && (
              <TarjetaCliente
                tenantNombre={tenant.nombre}
                miembroNombre={miembro.nombre}
                sellos={miembro.sellos_actuales}
                tarjetaSize={features.tarjeta_size}
                premios={tarjetaPremios}
                colorFondo={features.tarjeta_color_fondo}
                colorSello={features.tarjeta_color_sello}
                estiloSello={features.tarjeta_estilo_sello}
                fondoTipo={features.tarjeta_fondo_tipo}
                colorFondo2={features.tarjeta_color_fondo2}
                selloUrl={features.tarjeta_sello_url}
              />
            )}
          </div>

          <div className="lg:min-w-0">
            {features.cumpleanos_enabled && (
              <CumpleanosPrompt initialMes={miembro.mes_cumpleanos} />
            )}

            {features.notas_enabled && notas.length > 0 && (
              <NotasBoard notas={notas} />
            )}

            {features.feed_enabled && ultimoPost && (
              <div className="mb-6 flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    Última publicación
                  </p>
                  <Link
                    href="/feed"
                    className="text-xs text-electric hover:underline"
                  >
                    Ver todas →
                  </Link>
                </div>
                <FeedPostCard post={ultimoPost} tenant={tenant} />
              </div>
            )}

            <p className="text-[11px] uppercase tracking-wider text-muted mb-3">
              Explora
            </p>
            <nav className="grid grid-cols-2 gap-3 mb-8">
              <HomeTile
                href="/recompensas"
                label="Recompensas"
                hint="Canjea tus puntos"
                icon={<GiftIcon />}
              />
              <HomeTile
                href="/puntos"
                label="Historial"
                hint="Tus movimientos"
                icon={<ClockIcon />}
              />
              {features.feed_enabled && (
                <HomeTile
                  href="/feed"
                  label="Novedades"
                  hint={`Lo último de ${tenant.nombre}`}
                  icon={<SparkIcon />}
                />
              )}
              {features.galeria_enabled && (
                <HomeTile
                  href="/galeria"
                  label="Galería"
                  hint="Sube fotos y gana puntos"
                  icon={<ImageIcon />}
                />
              )}
              {features.lanzamientos_enabled && (
                <HomeTile
                  href="/lanzamientos"
                  label="Lanzamientos"
                  hint="Lo nuevo que se viene"
                  icon={<RocketIcon />}
                />
              )}
              {features.sorteos_enabled && (
                <HomeTile
                  href="/sorteos"
                  label="Sorteos"
                  hint="Participa y gana"
                  icon={<TicketIcon />}
                />
              )}
              {features.retos_enabled && (
                <HomeTile
                  href="/retos"
                  label="Retos"
                  hint="Cumple metas y gana"
                  icon={<TrophyIcon />}
                />
              )}
            </nav>

            <a href="/api/auth/logout" className="block">
              <Button
                variant="ghost"
                className="w-full text-muted hover:text-graphite"
              >
                Cerrar sesión
              </Button>
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

function HomeTile({
  href,
  label,
  hint,
  icon,
}: {
  href: string
  label: string
  hint: string
  icon: ReactNode
}) {
  return (
    <Link href={href} className="block group">
      <Card
        interactive
        padding="md"
        className="h-full flex flex-col justify-between min-h-[128px]"
      >
        <span className="grid place-items-center h-10 w-10 rounded-full bg-surface text-electric">
          {icon}
        </span>
        <div>
          <p className="text-base font-medium text-graphite">{label}</p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-xs text-muted leading-snug">{hint}</p>
            <span className="text-electric text-sm transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />
      <path d="M13 7v10" strokeDasharray="1.5 2.5" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 4.5-4.5 3 3 3.5-3.5L20 16" />
    </svg>
  )
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <path d="M12 3c3 1.6 5 4.6 5 8 0 2-.7 3.7-1.8 5H8.8C7.7 14.7 7 13 7 11c0-3.4 2-6.4 5-8Z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M8.8 16c-1.2.9-2 2.3-2 4M15.2 16c1.2.9 2 2.3 2 4" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 3 4M17 6h2.5a2.5 2.5 0 0 1-3 4" />
      <path d="M12 13v3M9 20h6M10 16h4l.5 4h-5Z" />
    </svg>
  )
}
