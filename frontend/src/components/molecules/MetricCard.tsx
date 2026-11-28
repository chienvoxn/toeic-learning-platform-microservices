import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/atoms/Card';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive?: boolean;
  };
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const colorVariants = {
  blue: {
    iconBg: 'bg-primary text-foreground border-border',
    valueText: 'text-foreground',
  },
  emerald: {
    iconBg: 'bg-success text-foreground border-border',
    valueText: 'text-foreground',
  },
  amber: {
    iconBg: 'bg-warning text-foreground border-border',
    valueText: 'text-foreground',
  },
  rose: {
    iconBg: 'bg-destructive text-foreground border-border',
    valueText: 'text-foreground',
  },
  indigo: {
    iconBg: 'bg-secondary text-foreground border-border',
    valueText: 'text-foreground',
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'blue',
  isLoading = false,
  className,
  onClick,
  children,
}: MetricCardProps) {
  const scheme = colorVariants[colorScheme] || colorVariants.blue;

  if (isLoading) {
    return (
      <Card variant="default" className={cn('p-5 space-y-3', className)}>
        <div className="flex items-center justify-between">
          <SkeletonLoader className="h-4 w-24" />
          <SkeletonLoader className="h-8 w-8 rounded-sm" />
        </div>
        <SkeletonLoader className="h-8 w-16" />
        <SkeletonLoader className="h-3 w-32" />
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      className={cn(
        'p-5 space-y-2.5 transition-shadow motion-reduce:transition-none',
        onClick && 'cursor-pointer hover:shadow-brutal',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 text-ink-muted">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</span>
        <div className={cn('p-2 rounded-sm border shrink-0', scheme.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className={cn('font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight', scheme.valueText)}>
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              'font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-sm border border-border',
              trend.positive ? 'bg-success text-foreground' : 'bg-destructive text-foreground'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-ink-muted font-medium leading-relaxed">{subtitle}</p>}
      {children}
    </Card>
  );
}
