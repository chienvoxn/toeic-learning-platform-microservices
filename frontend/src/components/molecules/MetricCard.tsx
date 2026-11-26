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
    iconBg: 'bg-blue-50 text-blue-600',
    valueText: 'text-slate-900',
  },
  emerald: {
    iconBg: 'bg-emerald-50 text-emerald-600',
    valueText: 'text-emerald-600',
  },
  amber: {
    iconBg: 'bg-amber-50 text-amber-600',
    valueText: 'text-amber-600',
  },
  rose: {
    iconBg: 'bg-rose-50 text-rose-600',
    valueText: 'text-rose-600',
  },
  indigo: {
    iconBg: 'bg-indigo-50 text-indigo-600',
    valueText: 'text-indigo-600',
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
      <Card className={cn('p-5 border-slate-200 bg-white shadow-xs space-y-3', className)}>
        <div className="flex items-center justify-between">
          <SkeletonLoader className="h-4 w-24" />
          <SkeletonLoader className="h-8 w-8 rounded-lg" />
        </div>
        <SkeletonLoader className="h-8 w-16" />
        <SkeletonLoader className="h-3 w-32" />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'p-5 border-slate-200 bg-white shadow-xs space-y-2 transition-shadow',
        onClick && 'cursor-pointer hover:shadow-elevation',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className={cn('p-2 rounded-lg', scheme.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className={cn('text-2xl font-black tracking-tight', scheme.valueText)}>
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-bold px-1.5 py-0.5 rounded-md',
              trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {children}
    </Card>
  );
}
