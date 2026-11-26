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
        'inline-flex items-center rounded-xl border border-slate-200 p-1 bg-slate-100/70',
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
              'flex items-center gap-1.5 font-bold rounded-lg transition-colors text-slate-600 hover:text-slate-900',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              isSelected && 'bg-white text-primary shadow-xs hover:text-primary font-bold'
            )}
            aria-pressed={isSelected}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'ml-1 text-[10px] px-1.5 py-0.2 rounded-full',
                  isSelected ? 'bg-blue-50 text-primary' : 'bg-slate-200 text-slate-600'
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
