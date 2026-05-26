'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminNavIcon, type AdminIconName } from '@/components/admin/AdminNavIcon'

export interface NavItem {
  href: string
  label: string
  icon: AdminIconName
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

// El estado activo se deriva de usePathname() (cliente) — no de headers() en
// el layout, porque el layout admin no se re-renderiza en navegación cliente
// entre rutas hermanas y el resaltado se quedaba pegado en la primera pestaña.
export function AdminNav({
  groups,
  variant,
}: {
  groups: NavGroup[]
  variant: 'sidebar' | 'mobile'
}) {
  const pathname = usePathname()

  if (variant === 'mobile') {
    const flat = groups.flatMap((g) => g.items)
    return (
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
    )
  }

  return (
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
  )
}
