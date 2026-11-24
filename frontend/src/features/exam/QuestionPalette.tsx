import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { AttemptQuestion } from '@/types/attempt';

interface QuestionPaletteProps {
  questions: AttemptQuestion[];
  currentIndex: number;
  selectedAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  bookmarks: Set<string>;
  onSelectQuestion: (index: number) => void;
  onSubmitClick: () => void;
  isSubmitting: boolean;
}

export function QuestionPalette({
  questions,
  currentIndex,
  selectedAnswers,
  bookmarks,
  onSelectQuestion,
  onSubmitClick,
  isSubmitting,
}: QuestionPaletteProps) {
  const total = questions.length;
  const answeredCount = questions.filter((q) => Boolean(selectedAnswers[q.id])).length;
  const unansweredCount = total - answeredCount;
  const bookmarkedCount = bookmarks.size;
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-5">
      {/* Progress Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Tiến độ hoàn thành</span>
          <span className="text-blue-600 font-bold">{progressPercent}% ({answeredCount}/{total})</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status Legends */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-y border-slate-100 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-blue-600" />
          <span>Đã trả lời ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
          <span>Chưa làm ({unansweredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span>Đã lưu lại ({bookmarkedCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full ring-2 ring-blue-600 ring-offset-1 bg-white" />
          <span>Đang xem</span>
        </div>
      </div>

      {/* Question Grid Buttons */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Danh sách câu hỏi</h4>
        <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = Boolean(selectedAnswers[q.id]);
            const isMarked = bookmarks.has(q.id);

            let btnClass = 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50';
            if (isAnswered) {
              btnClass = 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700';
            }
            if (isMarked) {
              btnClass = isAnswered
                ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
                : 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100';
            }
            if (isCurrent) {
              btnClass += ' ring-2 ring-offset-2 ring-blue-600 font-black';
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectQuestion(idx)}
                className={`h-9 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center relative ${btnClass}`}
              >
                {idx + 1}
                {isMarked && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-2 border-t border-slate-100">
        <Button
          variant="primary"
          className="w-full justify-center text-sm font-bold shadow-sm"
          onClick={onSubmitClick}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang nộp bài...' : 'Nộp bài thi'}
        </Button>

        {unansweredCount > 0 && (
          <p className="text-[11px] text-amber-600 text-center mt-2 flex items-center justify-center gap-1 font-medium">
            <HelpCircle className="h-3 w-3" /> Còn {unansweredCount} câu chưa chọn đáp án
          </p>
        )}
      </div>
    </Card>
  );
}
