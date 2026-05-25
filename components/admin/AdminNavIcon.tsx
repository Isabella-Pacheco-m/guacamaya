// Íconos del nav admin. Componente puro (sin estado) — set mínimo de líneas
// SVG con stroke currentColor para heredar el color del enlace.
export type AdminIconName =
  | 'dashboard'
  | 'miembros'
  | 'inactivos'
  | 'cumpleanos'
  | 'recompensas'
  | 'canjes'
  | 'tarjeta'
  | 'feed'
  | 'sorteos'
  | 'funcionalidades'
  | 'marca'

const PATHS: Record<AdminIconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  miembros: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6" />
      <path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 19" />
    </>
  ),
  inactivos: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  cumpleanos: (
    <>
      <path d="M4 20h16" />
      <path d="M5 20v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
      <path d="M5 14c1.6 1.2 3.2 1.2 4.7 0 1.6 1.2 3.1 1.2 4.7 0 1.6 1.2 3.1 1.2 4.6 0" />
      <path d="M12 8V5.5" />
      <circle cx="12" cy="4" r="0.6" />
    </>
  ),
  recompensas: (
    <>
      <rect x="3.5" y="8.5" width="17" height="12" rx="1.5" />
      <path d="M3.5 12.5h17" />
      <path d="M12 8.5v12" />
      <path d="M12 8.5C9 8.5 7.5 4 9.8 4S12 8.5 12 8.5Zm0 0c3 0 4.5-4.5 2.2-4.5S12 8.5 12 8.5Z" />
    </>
  ),
  canjes: (
    <>
      <path d="M3.5 8.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2a2 2 0 0 0 0 3v2a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15v-2a2 2 0 0 0 0-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  tarjeta: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9.5h18" />
      <circle cx="7.5" cy="14.5" r="1.3" />
      <path d="M11.5 14.5h6" />
    </>
  ),
  feed: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),
  sorteos: (
    <>
      <path d="M7 4h10v3a5 5 0 0 1-10 0Z" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 3 4" />
      <path d="M17 5h2.5a2.5 2.5 0 0 1-3 4" />
      <path d="M12 12v3" />
      <path d="M8.5 20h7" />
      <path d="M10 17h4l1 3H9Z" />
    </>
  ),
  funcionalidades: (
    <>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  marca: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.3-1-1.5-1-2.5s.8-1.5 2-1.5h1.5A3.5 3.5 0 0 0 20 8.5 9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
    </>
  ),
}

export function AdminNavIcon({
  name,
  className = 'h-[18px] w-[18px]',
}: {
  name: AdminIconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
