import { HTMLAttributes } from 'react'
import type { Nivel } from '@/types'

const NIVEL_STYLES: Record<Nivel, string> = {
  BRONCE: 'bg-graphite text-[#CD7F32]',
  PLATA: 'bg-graphite text-[#C0C0C0]',
  ORO: 'bg-graphite text-lime',
}

interface NivelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  nivel: Nivel
}

export function NivelBadge({ nivel, className = '', ...props }: NivelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide ${NIVEL_STYLES[nivel]} ${className}`}
      {...props}
    >
      {nivel}
    </span>
  )
}

type PillTone = 'neutral' | 'active' | 'success' | 'muted' | 'info'

const TONE_STYLES: Record<PillTone, string> = {
  neutral: 'bg-surface text-muted border border-border',
  active: 'bg-lime/30 text-graphite',
  success: 'bg-graphite text-lime',
  muted: 'bg-surface text-muted',
  info: 'bg-electric/10 text-electric',
}

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone
}

export function Pill({ tone = 'neutral', className = '', ...props }: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TONE_STYLES[tone]} ${className}`}
      {...props}
    />
  )
}

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}

export function StatusBadge({
  active,
  activeLabel = 'Activa',
  inactiveLabel = 'Inactiva',
  className = '',
  ...props
}: StatusBadgeProps) {
  const styles = active
    ? 'bg-lime/30 text-graphite'
    : 'bg-surface text-muted border border-border'
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles} ${className}`}
      {...props}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
