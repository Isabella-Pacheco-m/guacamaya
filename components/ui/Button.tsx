import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center font-medium rounded-full px-6 py-3 text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed'

const styles: Record<Variant, string> = {
  primary: `${base} bg-lime text-graphite hover:bg-lime/90 active:scale-[0.98] focus-visible:ring-graphite/40`,
  secondary: `${base} border border-border bg-white text-graphite hover:border-graphite hover:bg-white focus-visible:ring-graphite/30`,
  ghost: `${base} px-4 text-graphite hover:bg-white focus-visible:ring-graphite/20`,
  danger: `${base} border border-border bg-white text-graphite hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus-visible:ring-red-200`,
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => (
    <button ref={ref} className={`${styles[variant]} ${className}`} {...props} />
  )
)
Button.displayName = 'Button'
