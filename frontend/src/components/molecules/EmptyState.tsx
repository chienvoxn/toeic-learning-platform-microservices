import { LucideIcon, FolderSearch } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-border p-8 text-center bg-surface',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted border border-border text-foreground mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-extrabold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-ink-muted max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
