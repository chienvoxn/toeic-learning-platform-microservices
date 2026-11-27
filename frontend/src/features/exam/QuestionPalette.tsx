import { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Progress } from '@/components/atoms/Progress';
import { Bookmark, ChevronDown, ChevronUp, HelpCircle, Send } from 'lucide-react';
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
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);

  const total = questions.length;
  const answeredCount = questions.filter((q) => Boolean(selectedAnswers[q.id])).length;
  const unansweredCount = Math.max(0, total - answeredCount);
  const bookmarkedCount = questions.filter((q) => bookmarks.has(q.id)).length;
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <Card variant="flat" className="p-4 sm:p-5 border-[1.5px] border-border bg-surface shadow-brutal-sm space-y-4">
      {/* Mobile Collapsible Summary Header */}
      <div className="flex items-center justify-between gap-2 lg:hidden pb-3 border-b border-border/40">
        <div className="text-xs font-extrabold text-foreground">
          Bảng câu hỏi ({answeredCount}/{total} câu)
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpandedMobile((prev) => !prev)}
          aria-expanded={isExpandedMobile}
          aria-controls="exam-question-palette-body"
          className="text-xs"
        >
          {isExpandedMobile ? (
            <>
              <span>Thu gọn bảng</span>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              <span>Mở danh sách câu</span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      {/* Collapsible body on mobile, always visible on lg+ */}
      <div
        id="exam-question-palette-body"
        className={`${isExpandedMobile ? 'block' : 'hidden'} lg:block space-y-4`}
      >
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-foreground">
            <span>Tiến độ làm bài</span>
            <span className="font-mono">
              {progressPercent}% ({answeredCount}/{total})
            </span>
          </div>
          <Progress value={progressPercent} aria-label={`Tiến độ hoàn thành ${progressPercent}%`} />
        </div>

        {/* Orthogonal Status Legend */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-foreground border-y border-border/50 py-3">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-xs bg-secondary border border-border shrink-0" />
            <span>Đã trả lời ({answeredCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-xs bg-surface border border-border shrink-0" />
            <span>Chưa trả lời ({unansweredCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-xs bg-primary border border-border flex items-center justify-center shrink-0">
              <Bookmark className="h-2.5 w-2.5 text-foreground" aria-hidden="true" />
            </span>
            <span>Đã đánh dấu ({bookmarkedCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-xs bg-surface border-2 border-border ring-2 ring-border ring-offset-1 shrink-0" />
            <span>Câu đang xem</span>
          </div>
        </div>

        {/* Question Grid Buttons */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
            Danh sách câu hỏi
          </h4>
          <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1.5">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const selectedLetter = selectedAnswers[q.id];
              const isAnswered = Boolean(selectedLetter);
              const isMarked = bookmarks.has(q.id);

              const ariaLabel = `Câu ${idx + 1}${isCurrent ? ', đang xem' : ''}${
                isAnswered ? `, đã chọn ${selectedLetter}` : ', chưa trả lời'
              }${isMarked ? ', đã đánh dấu' : ''}`;

              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onSelectQuestion(idx)}
                  aria-label={ariaLabel}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`relative h-10 rounded-sm border-[1.5px] border-border text-xs font-mono transition-colors flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-60 ${
                    isAnswered
                      ? 'bg-secondary text-foreground font-extrabold'
                      : 'bg-surface text-foreground font-semibold hover:bg-background'
                  } ${isCurrent ? 'ring-2 ring-border ring-offset-2 ring-offset-surface shadow-brutal-sm z-10' : ''}`}
                >
                  <span className="leading-none">{idx + 1}</span>
                  {isAnswered && (
                    <span className="text-[9px] font-bold leading-none mt-0.5 text-foreground/80">
                      {selectedLetter}
                    </span>
                  )}
                  {isMarked && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-xs bg-primary border border-border flex items-center justify-center"
                    >
                      <Bookmark className="h-2 w-2 text-foreground fill-current" />
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 left-1.5 right-1.5 h-0.5 bg-foreground rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prominent Submit Action (always visible on mobile & desktop) */}
      <div className="pt-2 lg:border-t border-border/50 space-y-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onSubmitClick}
          disabled={isSubmitting}
        >
          <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{isSubmitting ? 'Đang nộp bài...' : 'Nộp bài thi'}</span>
        </Button>

        {unansweredCount > 0 && (
          <p className="text-[11px] font-semibold text-ink-muted text-center flex items-center justify-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Còn {unansweredCount} câu chưa chọn đáp án</span>
          </p>
        )}
      </div>
    </Card>
  );
}
