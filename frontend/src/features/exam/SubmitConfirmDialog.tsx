import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <Card className="max-w-md w-full p-6 shadow-xl border-slate-200 bg-white space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài thi</h3>
            <p className="text-xs text-slate-500">Sau khi nộp, hệ thống sẽ chấm điểm và khóa bài thi</p>
          </div>
        </div>

        {/* Exam Statistics Summary */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Tổng số câu hỏi:</span>
            <span className="font-bold text-slate-900">{totalQuestions}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Số câu đã trả lời:</span>
            <span className="font-bold text-emerald-600">{answeredCount}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Số câu chưa trả lời:</span>
            <span className={`font-bold ${unansweredCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {unansweredCount}
            </span>
          </div>
          {bookmarkedCount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Số câu đang đánh dấu:</span>
              <span className="font-bold text-amber-600">{bookmarkedCount}</span>
            </div>
          )}
        </div>

        {unansweredCount > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              Bạn vẫn còn <strong>{unansweredCount} câu chưa làm</strong>. Những câu này sẽ được tính là 0 điểm. Bạn có chắc chắn muốn nộp ngay?
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isSyncing}
          >
            Tiếp tục làm bài
          </Button>

          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isSubmitting || isSyncing}
          >
            {isSyncing ? 'Đang lưu đáp án...' : isSubmitting ? 'Đang chấm điểm...' : 'Đồng ý nộp bài'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
