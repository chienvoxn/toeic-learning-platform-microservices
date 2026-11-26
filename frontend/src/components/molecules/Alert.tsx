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
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
  };

  const icons = {
    info: <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />,
  };

  return (
    <div className={cn('flex gap-3 rounded-lg border p-4 text-sm', styles[type], className)} role="alert">
      {icons[type]}
      <div className="space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="leading-relaxed opacity-95">{children}</div>
      </div>
    </div>
  );
}
