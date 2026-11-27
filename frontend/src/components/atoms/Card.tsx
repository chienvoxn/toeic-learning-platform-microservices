import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat' | 'muted';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default: 'rounded-lg border-[1.5px] border-border bg-card text-card-foreground shadow-brutal-sm',
    elevated: 'rounded-lg border-2 border-border bg-card text-card-foreground shadow-brutal',
    flat: 'rounded-lg border border-border bg-card text-card-foreground shadow-none',
    muted: 'rounded-lg border border-border bg-muted text-foreground shadow-none',
  };

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-extrabold leading-snug tracking-tight text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground leading-relaxed', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
