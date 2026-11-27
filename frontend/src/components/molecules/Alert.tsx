import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = 'info', title, children, className }: AlertProps) {
  const styles = {
    info: 'bg-secondary/35 border-border text-foreground',
    success: 'bg-success/45 border-border text-foreground',
    warning: 'bg-warning/50 border-border text-foreground',
    error: 'bg-destructive/40 border-border text-foreground',
  };

  const icons = {
    info: <Info className="h-5 w-5 text-foreground shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-5 w-5 text-foreground shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5 w-5 text-foreground shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-5 w-5 text-foreground shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={cn('flex gap-3 rounded-md border-[1.5px] p-4 text-sm', styles[type], className)}
      role="alert"
    >
      {icons[type]}
      <div className="space-y-1 min-w-0 flex-1">
        {title && <h5 className="font-extrabold leading-snug tracking-tight text-foreground">{title}</h5>}
        <div className="leading-relaxed text-foreground/90">{children}</div>
      </div>
    </div>
  );
}
