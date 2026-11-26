import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number; // 0-indexed or 1-indexed according to baseIndex
  totalPages: number;
  onPageChange: (page: number) => void;
  baseIndex?: 0 | 1;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  baseIndex = 0,
  totalItems,
  pageSize,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const displayCurrent = baseIndex === 0 ? currentPage + 1 : currentPage;
  const canPrev = baseIndex === 0 ? currentPage > 0 : currentPage > 1;
  const canNext = baseIndex === 0 ? currentPage < totalPages - 1 : currentPage < totalPages;

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border-t border-slate-100 text-xs', className)}>
      {totalItems !== undefined && pageSize !== undefined ? (
        <span className="text-slate-500">
          Hiển thị{' '}
          <span className="font-semibold text-slate-700">
            {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalItems)}
          </span>{' '}
          trên tổng số <span className="font-semibold text-slate-700">{totalItems}</span>
        </span>
      ) : (
        <span className="text-slate-500">
          Trang <span className="font-bold text-slate-800">{displayCurrent}</span> / {totalPages}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className="h-8 px-2.5 text-xs gap-1 font-semibold"
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Trước
        </Button>
        <span className="px-2 font-mono text-slate-600 font-semibold">
          {displayCurrent} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          className="h-8 px-2.5 text-xs gap-1 font-semibold"
          aria-label="Trang sau"
        >
          Sau <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
