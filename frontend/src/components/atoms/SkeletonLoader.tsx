import { cn } from '@/lib/utils';

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse motion-reduce:animate-none rounded-sm bg-muted border border-border/30', className)}
    />
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="rounded-lg border-[1.5px] border-border bg-surface p-6 shadow-brutal-sm space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonLoader className="h-5 w-24 rounded-sm" />
        <SkeletonLoader className="h-5 w-16 rounded-sm" />
      </div>
      <SkeletonLoader className="h-6 w-3/4 rounded-sm" />
      <SkeletonLoader className="h-4 w-1/2 rounded-sm" />
      <div className="pt-2">
        <SkeletonLoader className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
