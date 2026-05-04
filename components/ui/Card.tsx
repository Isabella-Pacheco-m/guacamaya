import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  className = '',
  interactive = false,
  padding = 'md',
  ...props
}: CardProps) {
  const hover = interactive
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)]'
    : ''
  return (
    <div
      className={`bg-white rounded-lg shadow-card ${PADDING[padding]} ${hover} ${className}`}
      {...props}
    />
  )
}
