import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={twMerge(
            clsx(
              'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors',
              error ? 'border-red-300 focus:ring-red-300/30' : 'border-gray-200 focus:ring-accent/30',
              className,
            ),
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
