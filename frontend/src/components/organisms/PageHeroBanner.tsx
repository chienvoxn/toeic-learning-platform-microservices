import React from 'react';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

export interface PageHeroBannerProps {
  badgeText?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  gradient?: string;
  className?: string;
}

export function PageHeroBanner({
  badgeText,
  title,
  description,
  actions,
  className,
}: PageHeroBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-surface text-foreground p-6 sm:p-8 rounded-lg border-2 border-border border-l-8 border-l-primary shadow-brutal',
        className
      )}
    >
      <div className="space-y-2 max-w-2xl">
        {badgeText && (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="font-mono uppercase tracking-wider">
              {badgeText}
            </Badge>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          {description}
        </p>
      </div>

      {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
