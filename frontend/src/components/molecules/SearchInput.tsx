import { Search, X } from 'lucide-react';
import { Input, InputProps } from '@/components/atoms/Input';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Tìm kiếm...',
  className,
  ...props
}: SearchInputProps) {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('pl-9 pr-9 h-10 text-sm', className)}
        {...props}
      />
      {value && value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-foreground hover:bg-muted rounded-sm transition-colors"
          title="Xóa tìm kiếm"
          aria-label="Xóa tìm kiếm"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
