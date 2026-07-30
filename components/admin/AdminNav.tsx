'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'

export interface NavItem {
  href: string
  label: string
  icon: IconName
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
                'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full whitespace-nowrap border transition-colors ' +
                (active
                  ? 'bg-lime/20 border-lime/40 text-white'
                  : 'border-transparent text-white/65 hover:bg-white/10')
              }
            >
              <Icon
                name={item.icon}
                className={
                  'h-4 w-4 shrink-0 ' + (active ? 'text-lime' : 'text-white/60')
                }
              />
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
          <p className="eyebrow px-3.5 text-lime/45 mb-1.5">{group.label}</p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'group relative flex items-center gap-3 rounded-full pl-3.5 pr-3 py-2 text-sm transition-colors ' +
                  (active
                    ? 'bg-lime/15 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5')
                }
              >
                {active && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-lime" />
                )}
                <Icon
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
