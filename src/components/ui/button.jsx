import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-white hover:bg-brand-600',
        outline: 'border border-[#536471] text-[#e7e9ea] hover:bg-dark-hover',
        ghost: 'text-[#e7e9ea] hover:bg-dark-hover',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        secondary: 'bg-dark-surface text-[#e7e9ea] hover:bg-dark-hover',
        white: 'bg-white text-black hover:bg-gray-100',
        follow: 'bg-[#e7e9ea] text-black hover:bg-gray-200',
        unfollow: 'border border-[#536471] text-[#e7e9ea] hover:border-red-500 hover:text-red-500 hover:bg-red-500/10',
        link: 'text-brand underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-8',
        icon: 'h-9 w-9',
        xl: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
