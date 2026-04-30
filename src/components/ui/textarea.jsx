import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[80px] w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-sm text-[#e7e9ea] placeholder:text-[#71767b] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors',
      className
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
