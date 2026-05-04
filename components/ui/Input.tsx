import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-graphite"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`border border-border rounded-md px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric text-sm ${className}`}
          {...props}
        />
        {hint && !error && (
          <span className="text-xs text-muted">{hint}</span>
        )}
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
