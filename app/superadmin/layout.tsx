import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireSuperadmin } from '@/lib/superadmin-auth'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/superadmin', label: 'Dashboard' },
]

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // El panel del superadmin solo vive en el host raíz (sin subdominio).
  // Si alguien lo abre desde {slug}.host, redirigir al home del tenant.
  const slug = headers().get('x-tenant-slug') || ''
  if (slug) redirect('/')

  const { user } = await requireSuperadmin()

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="bg-graphite text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link
            href="/superadmin"
            className="flex items-center gap-3 shrink-0"
          >
            <Image
              src="/logo-dark.png"
              alt="Guacamaya"
              width={140}
              height={60}
              priority
              className="h-7 w-auto"
            />
            <span className="text-xs text-white/50 border-l border-white/15 pl-3 hidden sm:inline">
              Superadmin
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV.map((item) => (
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
              <span className="text-white/50">Superadmin</span>
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
            <a
              href="/api/auth/logout"
              className="text-xs text-white/70 hover:text-white px-3 py-2 rounded-full border border-white/20 hover:border-white/40 transition-colors"
            >
              Salir
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
