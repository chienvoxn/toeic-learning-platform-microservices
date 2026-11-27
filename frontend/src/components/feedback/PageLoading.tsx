import { Loader2 } from 'lucide-react';

export function PageLoading() {
  return (
    <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3 bg-background text-foreground">
      <div className="h-11 w-11 rounded-md border-[1.5px] border-border bg-primary text-foreground shadow-subtle flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
      </div>
      <span className="font-mono text-xs font-bold text-foreground">Đang tải trang...</span>
    </div>
  );
}
