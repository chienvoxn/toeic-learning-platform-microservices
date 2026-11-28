import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/Dialog';
import { Button } from '@/components/atoms/Button';
import { Alert } from '@/components/molecules/Alert';
import { CheckCircle2, RefreshCw } from 'lucide-react';

interface SubmitConfirmDialogProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  bookmarkedCount: number;
  isSyncing: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SubmitConfirmDialog({
  isOpen,
  totalQuestions,
  answeredCount,
  unansweredCount,
  bookmarkedCount,
  isSyncing,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: SubmitConfirmDialogProps) {
  const isBusy = isSubmitting || isSyncing;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isBusy) {
          onCancel();
        }
      }}
    >
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        hideCloseButton={isBusy}
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary border-[1.5px] border-border text-foreground flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Xác nhận nộp bài thi</DialogTitle>
              <DialogDescription>
                Sau khi nộp, bài làm sẽ được hệ thống chấm điểm và khóa chỉnh sửa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Exam Summary Dossier */}
        <div className="rounded-md border-[1.5px] border-border bg-background p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between text-ink-muted">
            <span>Tổng số câu:</span>
            <span className="font-mono tabular-nums font-extrabold text-foreground">{totalQuestions}</span>
          </div>
          <div className="flex items-center justify-between text-ink-muted">
            <span>Đã trả lời:</span>
            <span className="font-mono tabular-nums font-extrabold text-foreground">{answeredCount}</span>
          </div>
          <div className="flex items-center justify-between text-ink-muted">
            <span>Chưa trả lời:</span>
            <span
              className={`font-mono tabular-nums font-extrabold ${
                unansweredCount > 0 ? 'text-destructive-foreground bg-destructive/40 px-1.5 rounded-xs border border-border' : 'text-foreground'
              }`}
            >
              {unansweredCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-ink-muted pt-1 border-t border-border/30">
            <span>Đã đánh dấu:</span>
            <span className="font-mono tabular-nums font-extrabold text-foreground">{bookmarkedCount}</span>
          </div>
        </div>

        {unansweredCount > 0 && (
          <Alert type="warning" title={`Còn ${unansweredCount} câu chưa chọn đáp án`}>
            Những câu chưa trả lời sẽ không có điểm khi hệ thống chấm bài. Bạn vẫn có thể quay lại kiểm tra trước khi nộp.
          </Alert>
        )}

        {isSyncing && (
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-secondary/35 p-3 text-xs font-bold text-foreground">
            <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
            <span>Đang đồng bộ đáp án lên máy chủ trước khi nộp bài...</span>
          </div>
        )}

        {errorMessage && (
          <Alert type="error" title="Không thể hoàn tất nộp bài">
            {errorMessage}
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-2 pt-2 border-t border-border/30">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isBusy}
          >
            Tiếp tục làm bài
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={isBusy}
            isLoading={isBusy}
          >
            {isSyncing
              ? 'Đang đồng bộ đáp án...'
              : isSubmitting
              ? 'Đang nộp bài...'
              : errorMessage
              ? 'Thử nộp lại'
              : 'Xác nhận nộp bài'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
