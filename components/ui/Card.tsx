import { HTMLAttributes } from 'react'

/** Tintes de sección (los mismos de la landing). `paper` = tarjeta neutra. */
type CardTone = 'paper' | 'sol' | 'terra' | 'arcilla' | 'oliva'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  tone?: CardTone
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

// Las tarjetas tintadas llevan borde propio (el tinte lo define en globals);
// la neutra se apoya en la sombra cálida y un borde apenas insinuado.
const TONE: Record<CardTone, string> = {
  paper: 'bg-white border border-border/50',
  sol: 'border tint-sol',
  terra: 'border tint-terra',
  arcilla: 'border tint-arcilla',
  oliva: 'border tint-oliva',
}

export function Card({
  className = '',
  interactive = false,
  padding = 'md',
  tone = 'paper',
  ...props
}: CardProps) {
  const hover = interactive
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]'
    : ''
  return (
    <div
      className={`${TONE[tone]} rounded-lg shadow-card ${PADDING[padding]} ${hover} ${className}`}
      {...props}
    />
  )
}
