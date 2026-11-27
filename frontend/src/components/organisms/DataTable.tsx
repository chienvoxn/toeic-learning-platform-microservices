import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/atoms/Table';
import { Card } from '@/components/atoms/Card';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Pagination, PaginationProps } from '@/components/molecules/Pagination';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { cn } from '@/lib/utils';
import { LucideIcon, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  skeletonRowCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyActionText?: string;
  onEmptyAction?: () => void;
  pagination?: PaginationProps;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  skeletonRowCount = 5,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Hiện chưa có bản ghi nào để hiển thị.',
  emptyIcon = Inbox,
  emptyActionText,
  onEmptyAction,
  pagination,
  className,
}: DataTableProps<T>) {
  return (
    <Card variant="flat" className={cn('border-[1.5px] border-border bg-surface overflow-hidden flex flex-col', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted">
            {columns.map((col) => (
              <TableHead key={col.key} className={col.headerClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRowCount }).map((_, rIdx) => (
              <TableRow key={`skeleton-row-${rIdx}`}>
                {columns.map((col, cIdx) => (
                  <TableCell key={`skeleton-cell-${rIdx}-${cIdx}`} className={col.className}>
                    <SkeletonLoader className="h-5 w-full rounded-sm" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className="hover:bg-surface">
              <TableCell colSpan={columns.length} className="p-0 border-none">
                <div className="py-12">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    actionText={emptyActionText}
                    onAction={onEmptyAction}
                    className="border-none bg-transparent"
                  />
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={keyExtractor(item, index)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && data.length > 0 && pagination && (
        <Pagination {...pagination} />
      )}
    </Card>
  );
}
