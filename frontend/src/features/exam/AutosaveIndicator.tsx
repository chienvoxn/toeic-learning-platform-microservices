import { AutosaveStatus } from './types';
import { Cloud, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  onRetry: () => void;
}

export function AutosaveIndicator({
  status,
  lastSavedAt,
  errorMessage,
  onRetry,
}: AutosaveIndicatorProps) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Đang lưu...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 hover:bg-rose-100 transition-colors"
        title={errorMessage || 'Lưu thất bại. Bấm để thử lại'}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Chưa lưu - Thử lại</span>
      </button>
    );
  }

  if (status === 'saved' || lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <Check className="h-3.5 w-3.5" />
        <span>Đã lưu tự động</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Cloud className="h-3.5 w-3.5" />
      <span>Sẵn sàng</span>
    </div>
  );
}
