import { AutosaveStatus } from './types';
import { Cloud, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  hasPendingChanges?: boolean;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  onRetry: () => void;
}

export function AutosaveIndicator({
  status,
  hasPendingChanges = false,
  lastSavedAt,
  errorMessage,
  onRetry,
}: AutosaveIndicatorProps) {
  if (status === 'error') {
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-destructive/45 px-2.5 py-1 rounded-sm border-[1.5px] border-border hover:bg-destructive/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          title={errorMessage || 'Đồng bộ đáp án thất bại. Nhấn để thử lại.'}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Chưa đồng bộ đáp án</span>
          <span className="underline decoration-2 underline-offset-2 ml-0.5">Thử lại</span>
        </button>
      </div>
    );
  }

  if (status === 'saving' || hasPendingChanges) {
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary/45 px-2.5 py-1 rounded-sm border border-border">
          <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
          <span>Đang lưu đáp án...</span>
        </div>
      </div>
    );
  }

  if (!hasPendingChanges && (status === 'saved' || Boolean(lastSavedAt))) {
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-success/35 px-2.5 py-1 rounded-sm border border-border">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Đã lưu trên máy chủ</span>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center">
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted bg-background px-2.5 py-1 rounded-sm border border-border/60">
        <Cloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Sẵn sàng đồng bộ</span>
      </div>
    </div>
  );
}
