import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/Dialog';
import { QuestionInput } from '@/types/quiz';
import {
  Eye,
  CheckCircle2,
  HelpCircle,
  Headphones,
  BookOpen,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearnerPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  part: number;
  premium: boolean;
  questions: QuestionInput[];
}

export function LearnerPreviewModal({
  isOpen,
  onClose,
  title,
  part,
  premium,
  questions,
}: LearnerPreviewModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset preview interaction state cleanly each time modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(0);
      setSelectedChoices({});
      setShowExplanation(false);
    }
  }, [isOpen]);

  // Clamp active index if the underlying questions list shrinks while open
  useEffect(() => {
    setCurrentIdx((prev) => {
      if (questions.length === 0) return 0;
      return Math.min(prev, questions.length - 1);
    });
  }, [questions.length]);

  const safeIdx = questions.length > 0 ? Math.min(currentIdx, questions.length - 1) : 0;
  const currentQ = questions[safeIdx];
  const isListening = part >= 1 && part <= 4;
  const isSelected = (choice: string) => selectedChoices[safeIdx] === choice;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
        {/* Modal Top Header */}
        <DialogHeader className="px-6 py-4 border-b-[1.5px] border-border bg-background pr-12">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-secondary border border-border text-foreground shrink-0 mt-0.5">
              <Eye className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-extrabold text-foreground truncate">
                  {title || 'Đề thi không có tiêu đề'}
                </DialogTitle>
                <Badge variant={premium ? 'pro' : 'outline'} className="text-[11px]">
                  {premium ? 'PRO' : 'FREE'}
                </Badge>
                <Badge variant="warning" className="text-[11px]">
                  Chế độ xem trước dành cho giảng viên
                </Badge>
              </div>
              <DialogDescription className="text-xs text-ink-muted">
                Part {part} • {questions.length} câu hỏi • Không tạo lượt thi và không tiêu tốn hạn ngạch luyện tập
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body / Exam Simulation Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
          {questions.length === 0 || !currentQ ? (
            <div className="text-center py-12 border-[1.5px] border-dashed border-border rounded-md bg-surface text-ink-muted text-sm font-medium">
              Đề thi chưa có câu hỏi nào để hiển thị xem trước.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Question Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/20">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-sm bg-primary border border-border text-foreground">
                    Câu {safeIdx + 1} / {questions.length}
                  </span>
                  {isListening ? (
                    <Badge variant="outline" className="bg-surface text-xs gap-1">
                      <Headphones className="h-3.5 w-3.5" /> Listening
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-surface text-xs gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> Reading
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeIdx === 0}
                    onClick={() => {
                      setCurrentIdx(Math.max(0, safeIdx - 1));
                      setShowExplanation(false);
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Câu trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeIdx >= questions.length - 1}
                    onClick={() => {
                      setCurrentIdx(Math.min(questions.length - 1, safeIdx + 1));
                      setShowExplanation(false);
                    }}
                  >
                    Câu sau <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick Question Pills */}
              {questions.length > 1 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Điều hướng nhanh câu hỏi xem trước">
                  {questions.map((_, idx) => {
                    const active = idx === safeIdx;
                    const answered = Boolean(selectedChoices[idx]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentIdx(idx);
                          setShowExplanation(false);
                        }}
                        className={cn(
                          'h-7 min-w-[28px] px-2 rounded-sm font-mono text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-primary text-foreground border-border shadow-subtle'
                            : answered
                              ? 'bg-secondary/50 text-foreground border-border'
                              : 'bg-surface text-ink-muted border-border/50 hover:bg-muted'
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Media Preview (Audio / Image / Passage) */}
              {currentQ.audioUrl && (
                <div className="p-3.5 bg-surface border-[1.5px] border-border rounded-md space-y-1.5">
                  <span className="text-xs font-extrabold text-foreground uppercase tracking-wider block">
                    Audio bài nghe TOEIC
                  </span>
                  <audio controls src={currentQ.audioUrl} className="w-full h-9" />
                </div>
              )}

              {currentQ.imageUrl && (
                <div className="rounded-md overflow-hidden border-[1.5px] border-border max-h-72 flex justify-center bg-surface p-2">
                  <img src={currentQ.imageUrl} alt={`Hình minh họa câu ${safeIdx + 1}`} className="max-h-64 object-contain" />
                </div>
              )}

              {currentQ.passageText && (
                <div className="p-4 bg-surface border-[1.5px] border-border rounded-md text-xs md:text-sm font-serif whitespace-pre-wrap text-foreground leading-relaxed">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block font-sans mb-1.5">
                    Đoạn văn đọc hiểu
                  </span>
                  {currentQ.passageText}
                </div>
              )}

              {/* Question Prompt */}
              <div className="p-5 rounded-md bg-surface border-[1.5px] border-border shadow-brutal-sm space-y-2">
                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                  Nội dung câu hỏi
                </span>
                <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                  {currentQ.prompt || '(Chưa nhập nội dung câu hỏi)'}
                </p>
              </div>

              {/* Choices (A, B, C, and conditionally D) */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
                  Lựa chọn câu trả lời {part === 2 ? '(Part 2: 3 lựa chọn A–C)' : '(A–D)'}
                </span>
                {(part === 2 ? (['A', 'B', 'C'] as const) : (['A', 'B', 'C', 'D'] as const)).map((choiceKey) => {
                  const choiceText = currentQ[choiceKey.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
                  const selected = isSelected(choiceKey);
                  const isCorrect = currentQ.answer === choiceKey;

                  return (
                    <button
                      key={choiceKey}
                      type="button"
                      onClick={() => setSelectedChoices((prev) => ({ ...prev, [safeIdx]: choiceKey }))}
                      className={cn(
                        'w-full flex items-center gap-3.5 p-3.5 rounded-md border-[1.5px] text-left text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-border bg-primary/40 text-foreground shadow-subtle'
                          : 'border-border bg-surface hover:bg-muted text-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'h-7 w-7 rounded-sm font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-border transition-colors',
                          selected ? 'bg-primary text-foreground' : 'bg-background text-foreground'
                        )}
                      >
                        {choiceKey}
                      </div>
                      <span className="flex-1 text-xs sm:text-sm">
                        {choiceText || `(Lựa chọn ${choiceKey} trống)`}
                      </span>
                      {showExplanation && isCorrect && (
                        <Badge variant="success" className="text-[11px] ml-auto shrink-0">
                          Đáp án đúng
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Toggle Answer & Explanation for Teacher verification */}
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExplanation((prev) => !prev)}
                  className="gap-2 text-xs border-dashed"
                >
                  <HelpCircle className="h-4 w-4" />
                  {showExplanation ? 'Ẩn đáp án & giải thích' : 'Hiện đáp án & giải thích kiểm tra'}
                </Button>

                {showExplanation && (
                  <div className="mt-3 p-4 rounded-md bg-success/35 border-[1.5px] border-border text-xs text-foreground space-y-2">
                    <div className="flex items-center gap-2 font-extrabold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Đáp án đúng được cài đặt: ({currentQ.answer || 'Chưa chọn'})</span>
                    </div>
                    <div className="leading-relaxed">
                      <strong>Giải thích:</strong> {currentQ.explanation || '(Chưa có giải thích)'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3.5 border-t-[1.5px] border-border bg-surface flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs text-ink-muted">
            Chế độ xem trước của giảng viên — Dữ liệu lấy từ bản nháp hiện tại
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Đóng xem trước
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
