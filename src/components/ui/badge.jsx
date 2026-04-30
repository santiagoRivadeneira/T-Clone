import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-white',
        secondary: 'border-transparent bg-dark-surface text-[#e7e9ea]',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'border-dark-border text-[#71767b]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
