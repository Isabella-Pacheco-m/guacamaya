import Link from 'next/link'
import Image from 'next/image'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'
import { AdminNav } from '@/components/admin/AdminNav'
import type { AdminIconName } from '@/components/admin/AdminNavIcon'

export const dynamic = 'force-dynamic'

type FeatureFlag =
  | 'cumpleanos_enabled'
  | 'feed_enabled'
  | 'sorteos_enabled'
  | 'tarjeta_enabled'
  | 'notas_enabled'
  | 'galeria_enabled'
  | 'lanzamientos_enabled'
  | 'retos_enabled'

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
        href: '/admin/notas',
        label: 'Notas',
        icon: 'notas',
        requires: 'notas_enabled',
      },
      {
        href: '/admin/galeria',
        label: 'Galería',
        icon: 'galeria',
        requires: 'galeria_enabled',
      },
      {
        href: '/admin/lanzamientos',
        label: 'Lanzamientos',
        icon: 'lanzamientos',
        requires: 'lanzamientos_enabled',
      },
      {
        href: '/admin/sorteos',
        label: 'Sorteos',
        icon: 'sorteos',
        requires: 'sorteos_enabled',
      },
      {
        href: '/admin/retos',
        label: 'Retos',
        icon: 'retos',
        requires: 'retos_enabled',
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.requires || features[i.requires]),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="min-h-screen bg-surface lg:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-graphite text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="px-6 py-6">
          <Link href="/admin/dashboard" className="inline-flex">
            <Image
              src="/logo-dark.png"
              alt="Guacamaya"
              width={140}
              height={60}
              priority
              className="h-9 w-auto"
            />
          </Link>
        </div>

        <AdminNav groups={groups} variant="sidebar" />

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
          <Link href="/admin/dashboard" className="inline-flex">
            <Image
              src="/logo-dark.png"
              alt="Guacamaya"
              width={140}
              height={60}
              className="h-6 w-auto"
            />
          </Link>
          <a
            href="/api/auth/logout"
            className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-full border border-white/20"
          >
            Salir
          </a>
        </div>
        <AdminNav groups={groups} variant="mobile" />
      </header>

      <div className="flex-1 min-w-0">
        <main className="max-w-6xl mx-auto px-6 py-8 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  )
}
