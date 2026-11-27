import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export interface FilterButtonGroupProps<T extends string | number> {
  options: FilterOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function FilterButtonGroup<T extends string | number>({
  options,
  selectedValue,
  onChange,
  className,
  size = 'sm',
}: FilterButtonGroupProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center rounded-md border-[1.5px] border-border p-1 bg-muted gap-1',
        className
      )}
      role="group"
    >
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        const Icon = opt.icon;

        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 font-bold rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              isSelected
                ? 'bg-primary text-foreground border-border shadow-subtle'
                : 'border-transparent text-ink-muted hover:text-foreground hover:bg-surface/70'
            )}
            aria-pressed={isSelected}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'ml-1 font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-border',
                  isSelected ? 'bg-surface text-foreground' : 'bg-background text-ink-muted'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
