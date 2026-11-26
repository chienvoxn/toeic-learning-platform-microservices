import { cn } from '@/lib/utils';

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200/80', className)}
    />
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonLoader className="h-5 w-24 rounded-full" />
        <SkeletonLoader className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonLoader className="h-6 w-3/4 rounded-md" />
      <SkeletonLoader className="h-4 w-1/2 rounded-md" />
      <div className="pt-2">
        <SkeletonLoader className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
