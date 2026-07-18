import Link from 'next/link'
import type { ReactNode } from 'react'
import type { FeedPostPublic, Miembro, Tenant } from '@/types'
import type { TenantFeatures } from '@/lib/tenant-features'
import type { TarjetaPremioEstado } from '@/lib/tenantQueries'
import type { Nota } from '@/lib/notas'
import type { GaleriaPostPublic } from '@/lib/galeria'
import type { Reto } from '@/lib/retos'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { CumpleanosPrompt } from '@/components/pwa/CumpleanosPrompt'
import { TarjetaCliente } from '@/components/pwa/TarjetaCliente'
import { AvatarUploader } from '@/components/pwa/AvatarUploader'
import { notaColorStyle } from '@/lib/notas'
import { NIVEL_PROGRESO } from '@/lib/business'

const COP = new Intl.NumberFormat('es-CO')
const venceFmt = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Bogota',
})


/** Anticipo de la comunidad que se muestra en la home. */
export interface ComunidadPreview {
  notas: Nota[]
  fotos: GaleriaPostPublic[]
  ultimoPost: FeedPostPublic | null
  retoActivo: Reto | null
  hayAlgo: boolean
}

export function TenantPwaHome({
  tenant,
  miembro,
  features,
  tarjetaPremios,
  comunidad,
  caducidadProxima,
}: {
  tenant: Tenant
  miembro: Miembro
  features: TenantFeatures
  tarjetaPremios: TarjetaPremioEstado[]
  comunidad: ComunidadPreview
  /**
   * Aviso de vencimiento SOLO si está cerca (ver AVISO_CADUCIDAD_DIAS en
   * app/page.tsx). El detalle completo vive en /puntos; en la home un
   * vencimiento a 11 meses sería ruido.
   */
  caducidadProxima: { puntos: number; fecha: string } | null
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

      {/* ── Portada: banner + logo + identidad del miembro ── */}
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

          {/* La marca va ARRIBA de la portada: el borde inferior queda libre
              para el avatar del miembro, que se monta sobre él. Antes ambos
              vivían abajo y en móvil se cruzaban. */}
          <div className="absolute left-0 right-0 top-0 px-6 pt-5 flex items-center gap-3">
            {tenant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.nombre}
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-contain bg-white/95 p-1.5 shadow-md ring-1 ring-white/40 shrink-0"
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

        <div className="px-6 max-w-md lg:max-w-5xl mx-auto">
          {/* En desktop el avatar solapa menos el banner: con -mt-8 el título
              quedaba montado sobre la foto y se leía apretado. */}
          <div className="-mt-8 lg:-mt-4 flex items-end justify-between gap-4 lg:gap-5">
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

      <div className="px-6 pt-8 pb-14 sm:px-8 max-w-md lg:max-w-5xl mx-auto flex flex-col gap-10">
        {/* ══════════ TU CUENTA ══════════ */}
        <section>
          <SectionTitle
            titulo="Tu cuenta"
            hint="Tus puntos, tu tarjeta y tus canjes"
          />

          {/* Desktop: la tarjeta ocupa la columna derecha entera (dos filas) y
              los accesos rellenan el hueco que dejaba la columna izquierda bajo
              el card de puntos. La colocación explícita por fila/columna deja
              intacto el orden en móvil (puntos → tarjeta → accesos), que sí
              queremos: la tarjeta es lo primero que el cliente busca. */}
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Card
              padding="lg"
              className="flex flex-col justify-between min-h-[220px] lg:col-start-1 lg:row-start-1"
            >
              <p className="text-[11px] uppercase tracking-wider text-muted">
                Tus puntos
              </p>
              <div className="flex items-baseline gap-2 mt-2 mb-6">
                <span className="text-[56px] lg:text-[68px] font-light leading-none tracking-tight tabular-nums">
                  {COP.format(miembro.puntos_actuales)}
                </span>
                <span className="text-sm text-muted">disponibles</span>
              </div>

              {progreso.siguiente && progreso.meta != null ? (
                <div>
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
                </div>
              ) : (
                <p className="text-xs text-muted">Estás en el nivel máximo. ✨</p>
              )}

              {caducidadProxima && (
                <Link
                  href="/puntos"
                  className="mt-4 block rounded-md bg-surface border border-border px-3 py-2 text-xs text-graphite hover:border-graphite/40 transition-colors"
                >
                  <span className="font-medium tabular-nums">
                    {COP.format(caducidadProxima.puntos)} puntos
                  </span>{' '}
                  vencen el{' '}
                  {venceFmt.format(
                    new Date(`${caducidadProxima.fecha}T12:00:00Z`)
                  )}
                  . Úsalos →
                </Link>
              )}
            </Card>

            {features.tarjeta_enabled ? (
              <div className="[&>div]:mb-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
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
              </div>
            ) : (
              // Sin tarjeta, los accesos ocupan la segunda columna y no queda
              // un hueco en desktop.
              <div className="grid grid-cols-2 gap-3">
                <AccountTile href="/recompensas" label="Recompensas" hint="Canjea tus puntos" icon={<GiftIcon />} />
                <AccountTile href="/puntos" label="Historial" hint="Tus movimientos" icon={<ClockIcon />} />
              </div>
            )}

            {features.tarjeta_enabled && (
              // En desktop se apilan (una columna): dos tiles anchos rellenan
              // el alto de la tarjeta mucho mejor que cuatro cuartos de ancho.
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:col-start-1 lg:row-start-2">
                <AccountTile href="/recompensas" label="Recompensas" hint="Canjea tus puntos" icon={<GiftIcon />} />
                <AccountTile href="/puntos" label="Historial" hint="Tus movimientos" icon={<ClockIcon />} />
              </div>
            )}
          </div>

          {features.cumpleanos_enabled && (
            <div className="mt-4">
              <CumpleanosPrompt initialMes={miembro.mes_cumpleanos} />
            </div>
          )}
        </section>

        {/* ══════════ COMUNIDAD ══════════ */}
        {comunidad.hayAlgo && (
          <section>
            <SectionTitle
              titulo="Comunidad"
              hint={`Lo que pasa en ${tenant.nombre}`}
              accion={{ href: '/comunidad', label: 'Ver todo' }}
            />

            <Link href="/comunidad" className="block group">
              <Card
                padding="md"
                className="overflow-hidden transition-shadow group-hover:shadow-[0_2px_4px_rgba(42,35,32,0.06),0_10px_28px_rgba(42,35,32,0.08)]"
              >
                <div className="flex flex-col gap-4">
                  {/* Notas recientes — SIEMPRE en dos columnas: con `flex-1` una
                      nota sola ocupaba todo el ancho y, al ser cuadrada, se
                      volvía un bloque gigante. */}
                  {comunidad.notas.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {comunidad.notas.slice(0, 2).map((n, i) => {
                        const s = notaColorStyle(n.color)
                        return (
                          <div
                            key={n.id}
                            // Cuadradas como un post-it real, pero con tope: sin
                            // el max-w crecen demasiado en pantallas anchas.
                            className={
                              'min-w-0 w-full max-w-[220px] aspect-square rounded-xl p-3 text-[12.5px] leading-snug line-clamp-6 ' +
                              (i % 2 === 0 ? '-rotate-1' : 'rotate-1')
                            }
                            style={{
                              background: s.bg,
                              border: `1px solid ${s.border}`,
                              color: s.text,
                            }}
                          >
                            {n.cuerpo}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Tira de fotos de la galería */}
                  {comunidad.fotos.length > 0 && (
                    <div className="flex gap-2">
                      {comunidad.fotos.slice(0, 4).map((f) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={f.id}
                          src={f.imagen_url}
                          alt=""
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover bg-surface ring-1 ring-graphite/[0.06]"
                        />
                      ))}
                    </div>
                  )}

                  {/* Reto activo */}
                  {comunidad.retoActivo && (
                    <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                      <span className="grid place-items-center h-8 w-8 rounded-full bg-lime/40 text-graphite shrink-0">
                        <TrophyIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {comunidad.retoActivo.titulo}
                        </p>
                        <p className="text-[11px] text-muted">
                          Reto activo
                          {comunidad.retoActivo.puntos > 0 &&
                            ` · +${comunidad.retoActivo.puntos} pts`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Última publicación */}
                  {comunidad.ultimoPost && (
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Post del negocio (sin autor_miembro_id): va el logo de
                          la marca, igual que en FeedPostCard. Antes caía al
                          Avatar con avatar_url null y quedaba un hueco. */}
                      {comunidad.ultimoPost.autor_miembro_id == null &&
                      tenant.logo_url ? (
                        <span className="h-8 w-8 rounded-full bg-white ring-1 ring-black/[0.06] shrink-0 overflow-hidden flex items-center justify-center">
                          {/* object-cover: llena el círculo como foto de
                              perfil, sin el margen del contain. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={tenant.logo_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <Avatar
                          name={
                            comunidad.ultimoPost.autor_nombre ?? tenant.nombre
                          }
                          src={comunidad.ultimoPost.autor_avatar_url}
                          size={32}
                        />
                      )}
                      <p className="text-sm text-muted truncate min-w-0">
                        <span className="text-graphite font-medium">
                          {comunidad.ultimoPost.autor_nombre ?? tenant.nombre}
                        </span>{' '}
                        · {comunidad.ultimoPost.cuerpo}
                      </p>
                    </div>
                  )}

                  <span className="text-sm text-electric font-medium inline-flex items-center gap-1">
                    Entrar a la comunidad
                    <span className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </Card>
            </Link>
          </section>
        )}

        <a href="/api/auth/logout" className="block">
          <Button variant="ghost" className="w-full text-muted hover:text-graphite">
            Cerrar sesión
          </Button>
        </a>
      </div>
    </main>
  )
}

function SectionTitle({
  titulo,
  hint,
  accion,
}: {
  titulo: string
  hint?: string
  accion?: { href: string; label: string }
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-medium tracking-tight">{titulo}</h2>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      {accion && (
        <Link
          href={accion.href}
          className="text-xs text-electric hover:underline shrink-0"
        >
          {accion.label} →
        </Link>
      )}
    </div>
  )
}

function AccountTile({
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
        className="h-full flex flex-col justify-between min-h-[112px]"
      >
        <span className="grid place-items-center h-9 w-9 rounded-full bg-surface text-electric">
          {icon}
        </span>
        <div className="mt-3">
          <p className="text-[15px] font-medium text-graphite">{label}</p>
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

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
      <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 3 4M17 6h2.5a2.5 2.5 0 0 1-3 4" />
      <path d="M12 13v3M9 20h6M10 16h4l.5 4h-5Z" />
    </svg>
  )
}
