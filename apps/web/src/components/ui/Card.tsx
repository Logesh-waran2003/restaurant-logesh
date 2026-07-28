import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export function Card({ glass, className, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl p-4',
          glass ? 'glass' : 'bg-white border border-gray-200 shadow-sm',
          className,
        ),
      )}
      {...props}
    >
      {children}
    </div>
  )
}
