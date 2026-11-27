import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'pro';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground border-border',
    secondary: 'bg-muted text-foreground border-border',
    outline: 'bg-surface text-foreground border-border',
    success: 'bg-success text-success-foreground border-border',
    warning: 'bg-warning text-warning-foreground border-border',
    destructive: 'bg-destructive text-destructive-foreground border-border',
    pro: 'bg-primary text-primary-foreground border-border font-mono uppercase shadow-subtle',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-bold tracking-tight transition-colors motion-reduce:transition-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
