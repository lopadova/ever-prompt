import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-500/10 text-indigo-400',
        secondary: 'border-transparent bg-zinc-800 text-zinc-300',
        destructive: 'border-transparent bg-red-500/10 text-red-400',
        outline: 'border-zinc-700 text-zinc-400',
        success: 'border-transparent bg-green-500/10 text-green-400',
        warning: 'border-transparent bg-yellow-500/10 text-yellow-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
