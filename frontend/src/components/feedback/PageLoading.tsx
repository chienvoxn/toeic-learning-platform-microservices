import { Loader2 } from 'lucide-react';

export function PageLoading() {
  return (
    <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Đang tải trang...</span>
    </div>
  );
}
