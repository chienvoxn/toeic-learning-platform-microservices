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
  gradient = 'from-blue-600 via-blue-700 to-indigo-800',
  className,
}: PageHeroBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r p-6 sm:p-8 rounded-2xl text-white shadow-card',
        gradient,
        className
      )}
    >
      <div className="space-y-2 max-w-2xl">
        {badgeText && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/30 bg-white/10 text-white font-bold text-[11px] tracking-wider uppercase">
              {badgeText}
            </Badge>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
          {description}
        </p>
      </div>

      {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
