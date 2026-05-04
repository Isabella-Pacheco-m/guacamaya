import Link from 'next/link'
import Image from 'next/image'
import { requireAdmin } from '@/lib/page-auth'
import { getTenantFeatures } from '@/lib/tenant-features'

export const dynamic = 'force-dynamic'

interface NavItem {
  href: string
  label: string
  requires?: 'cumpleanos_enabled' | 'feed_enabled' | 'sorteos_enabled' | 'tarjeta_enabled'
}

const NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/miembros', label: 'Miembros' },
  { href: '/admin/inactivos', label: 'Inactivos' },
  { href: '/admin/recompensas', label: 'Recompensas' },
  { href: '/admin/canjes', label: 'Canjes' },
  { href: '/admin/cumpleaneros', label: 'Cumpleaños', requires: 'cumpleanos_enabled' },
  { href: '/admin/tarjeta', label: 'Tarjeta', requires: 'tarjeta_enabled' },
  { href: '/admin/feed', label: 'Feed', requires: 'feed_enabled' },
  { href: '/admin/sorteos', label: 'Sorteos', requires: 'sorteos_enabled' },
  { href: '/admin/funcionalidades', label: 'Funcionalidades' },
  { href: '/admin/marca', label: 'Marca' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, tenantId } = await requireAdmin()
  const features = await getTenantFeatures(tenantId)
  const nav = NAV.filter((item) => !item.requires || features[item.requires])

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="bg-graphite text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link href="/admin/dashboard" className="text-lime font-medium tracking-tight">
            Guacamaya
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right text-xs leading-tight">
              <span className="text-white">{user.name ?? user.email}</span>
              <span className="text-white/50">Admin</span>
            </div>
            {user.picture && (
              <Image
                src={user.picture}
                alt=""
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
            )}
            <Link
              href="/api/auth/logout"
              className="text-xs text-white/70 hover:text-white px-3 py-2 rounded-full border border-white/20 hover:border-white/40 transition-colors"
            >
              Salir
            </Link>
          </div>
        </div>

        <nav className="md:hidden border-t border-white/10 px-6 py-2 flex gap-1 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-xs rounded-full text-white/80 hover:bg-white/10 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
