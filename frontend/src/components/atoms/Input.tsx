import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-bold text-foreground">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-primary-light/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted transition-colors motion-reduce:transition-none',
            error && 'border-2 border-border bg-destructive/20 focus-visible:ring-ring',
            className
          )}
          ref={ref}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && (
          <p
            className="inline-block rounded-sm border border-border bg-destructive/50 px-2 py-0.5 text-xs font-bold text-foreground"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
