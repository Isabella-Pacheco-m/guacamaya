import type { CSSProperties } from 'react'

// Avatar robusto: dimensiones fijas por estilo inline (nunca colapsa dentro de
// un flex, que era el bug del avatar-tira). Si hay `src` muestra la foto; si no,
// dibuja las iniciales del nombre sobre un degradado. Sirve en Server y Client
// Components (sin hooks).

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  src,
  size = 44,
  className = '',
  ring = false,
}: {
  name: string
  src?: string | null
  /** Diámetro en px. */
  size?: number
  className?: string
  /** Añade un anillo sutil (útil sobre fondos con foto). */
  ring?: boolean
}) {
  const box: CSSProperties = { width: size, height: size, minWidth: size }
  const ringCls = ring ? 'ring-2 ring-white/80' : ''

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={box}
        className={`shrink-0 rounded-full object-cover bg-surface ${ringCls} ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: Math.round(size * 0.4) }}
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold leading-none text-white bg-gradient-to-br from-electric to-sky select-none ${ringCls} ${className}`}
    >
      {initials(name)}
    </span>
  )
}
