import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { AdminNavIcon, type AdminIconName } from '@/components/admin/AdminNavIcon'

export const dynamic = 'force-dynamic'

type FeatureFlag =
  | 'cumpleanos_enabled'
  | 'feed_enabled'
  | 'sorteos_enabled'
  | 'tarjeta_enabled'

interface NavItem {
  href: string
  label: string
  icon: AdminIconName
  requires?: FeatureFlag
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Nav agrupada: en vez de 11 enlaces sueltos, secciones con sentido para que
// el panel escale y se lea de un vistazo.
const GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    label: 'Clientes',
    items: [
      { href: '/admin/miembros', label: 'Miembros', icon: 'miembros' },
      { href: '/admin/inactivos', label: 'Inactivos', icon: 'inactivos' },
      {
        href: '/admin/cumpleaneros',
        label: 'Cumpleaños',
        icon: 'cumpleanos',
        requires: 'cumpleanos_enabled',
      },
    ],
  },
  {
    label: 'Fidelización',
    items: [
      { href: '/admin/recompensas', label: 'Recompensas', icon: 'recompensas' },
      { href: '/admin/canjes', label: 'Canjes', icon: 'canjes' },
      {
        href: '/admin/tarjeta',
        label: 'Tarjeta',
        icon: 'tarjeta',
        requires: 'tarjeta_enabled',
      },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { href: '/admin/feed', label: 'Feed', icon: 'feed', requires: 'feed_enabled' },
      {
        href: '/admin/sorteos',
        label: 'Sorteos',
        icon: 'sorteos',
        requires: 'sorteos_enabled',
      },
    ],
  },
  {
    label: 'Configuración',
    items: [
      {
        href: '/admin/funcionalidades',
        label: 'Funcionalidades',
        icon: 'funcionalidades',
      },
      { href: '/admin/marca', label: 'Marca', icon: 'marca' },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  const pathname = headers().get('x-pathname') || '/admin/dashboard'

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.requires || features[i.requires]),
  })).filter((g) => g.items.length > 0)

  // Lista plana para el nav horizontal de móvil.
  const flat = groups.flatMap((g) => g.items)

  return (
    <div className="min-h-screen bg-surface lg:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-graphite text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="px-6 py-6">
          <Link
            href="/admin/dashboard"
            className="text-lime text-lg font-medium tracking-tight"
          >
            Guacamaya
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-3 text-[10px] uppercase tracking-[0.18em] text-white/35 mb-1">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ' +
                      (active
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5')
                    }
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-lime" />
                    )}
                    <AdminNavIcon
                      name={item.icon}
                      className={
                        'h-[18px] w-[18px] shrink-0 ' +
                        (active ? 'text-lime' : 'text-white/55 group-hover:text-white')
                      }
                    />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 flex items-center gap-3">
          {user.picture ? (
            <Image
              src={user.picture}
              alt=""
              width={36}
              height={36}
              className="rounded-full shrink-0"
              unoptimized
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-white/10 shrink-0" />
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm text-white truncate">
              {user.name ?? user.email}
            </p>
            <p className="text-[11px] text-white/45">Admin</p>
          </div>
          <a
            href="/api/auth/logout"
            title="Cerrar sesión"
            className="text-white/55 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
              aria-hidden
            >
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
              <path d="M10 12H3" />
              <path d="m6 8-4 4 4 4" />
            </svg>
          </a>
        </div>
      </aside>

      {/* Top bar — móvil */}
      <header className="lg:hidden bg-graphite text-white sticky top-0 z-20">
        <div className="px-5 py-3 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="text-lime font-medium tracking-tight"
          >
            Guacamaya
          </Link>
          <a
            href="/api/auth/logout"
            className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-full border border-white/20"
          >
            Salir
          </a>
        </div>
        <nav className="border-t border-white/10 px-3 py-2 flex gap-1 overflow-x-auto">
          {flat.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ' +
                  (active
                    ? 'bg-white/15 text-white'
                    : 'text-white/65 hover:bg-white/10')
                }
              >
                <AdminNavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <div className="flex-1 min-w-0">
        <main className="max-w-6xl mx-auto px-6 py-8 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  )
}
