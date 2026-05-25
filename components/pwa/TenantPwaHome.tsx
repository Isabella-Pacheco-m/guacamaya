import Link from 'next/link'
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
}: {
  tenant: Tenant
  miembro: Miembro
  features: TenantFeatures
  tarjetaPremios: TarjetaPremioEstado[]
  ultimoPost: FeedPost | null
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
      <div className="px-6 py-10 sm:px-8 lg:py-14 max-w-md lg:max-w-5xl mx-auto">
        <TenantTheme color={tenant.color_primario} />
        <header className="mb-8 lg:mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {tenant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.nombre}
                className="h-11 w-11 lg:h-14 lg:w-14 rounded-md object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted truncate">
                {tenant.nombre}
              </p>
              <h1 className="text-2xl lg:text-3xl font-light mt-0.5 truncate">
                Hola, {miembro.nombre.split(' ')[0]}
              </h1>
            </div>
          </div>
          <NivelBadge nivel={miembro.nivel} />
        </header>

        {/* Mobile: una columna (margenes mb-* de cada bloque dan el ritmo).
            Desktop (lg): dos columnas; izquierda = puntos + tarjeta, derecha =
            cumpleaños + feed + accesos. El orden de apilado en móvil se conserva
            porque la columna izquierda se renderiza completa antes que la derecha. */}
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
              />
            )}
          </div>

          <div className="lg:min-w-0">
            {features.cumpleanos_enabled && (
              <CumpleanosPrompt initialMes={miembro.mes_cumpleanos} />
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
                <FeedPostCard post={ultimoPost} />
              </div>
            )}

            <nav className="grid grid-cols-2 gap-3 mb-8">
              <HomeTile
                href="/recompensas"
                label="Recompensas"
                hint="Canjea tus puntos"
              />
              <HomeTile href="/puntos" label="Historial" hint="Tus movimientos" />
              {features.feed_enabled && (
                <HomeTile
                  href="/feed"
                  label="Novedades"
                  hint={`Lo último de ${tenant.nombre}`}
                />
              )}
              {features.sorteos_enabled && (
                <HomeTile href="/sorteos" label="Sorteos" hint="Participa y gana" />
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
}: {
  href: string
  label: string
  hint: string
}) {
  return (
    <Link href={href} className="block group">
      <Card
        interactive
        padding="md"
        className="h-full flex flex-col justify-between min-h-[112px]"
      >
        <p className="text-base font-medium text-graphite">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-xs text-muted leading-snug">{hint}</p>
          <span className="text-electric text-sm transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </Card>
    </Link>
  )
}
