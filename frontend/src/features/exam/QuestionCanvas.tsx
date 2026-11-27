import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import {
  Bookmark,
  BookmarkCheck,
  Headphones,
  Image as ImageIcon,
  BookOpen,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { AttemptQuestion } from '@/types/attempt';

interface QuestionCanvasProps {
  question: AttemptQuestion;
  currentIndex: number;
  totalQuestions: number;
  selectedChoice: 'A' | 'B' | 'C' | 'D' | null;
  isBookmarked: boolean;
  onSelectChoice: (choice: 'A' | 'B' | 'C' | 'D') => void;
  onToggleBookmark: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  disabled?: boolean;
}

export function QuestionCanvas({
  question,
  currentIndex,
  totalQuestions,
  selectedChoice,
  isBookmarked,
  onSelectChoice,
  onToggleBookmark,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  disabled = false,
}: QuestionCanvasProps) {
  const [audioError, setAudioError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const promptContainerRef = useRef<HTMLDivElement>(null);
  const radiogroupRef = useRef<HTMLDivElement>(null);
  const wasRadioFocusedRef = useRef(false);
  const prevQuestionIdRef = useRef(question.id);

  useEffect(() => {
    setAudioError(false);
    setImageError(false);
  }, [question.id, question.audioUrl, question.imageUrl]);

  // Move focus cleanly to the new question prompt only if focus previously sat inside the radiogroup
  useEffect(() => {
    if (prevQuestionIdRef.current !== question.id) {
      prevQuestionIdRef.current = question.id;
      if (wasRadioFocusedRef.current) {
        wasRadioFocusedRef.current = false;
        promptContainerRef.current?.focus({ preventScroll: true });
      }
    }
  }, [question.id]);

  // Only render choices actually provided by the backend (Part 2 has A-C; other parts have A-D)
  const allChoices: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const validChoices = allChoices.filter(
    (letter) =>
      question.choices &&
      question.choices[letter] !== undefined &&
      question.choices[letter] !== null &&
      String(question.choices[letter]).trim() !== ''
  );

  const hasPassage = Boolean(question.passageText && question.passageText.trim().length > 0);

  // Allow ArrowUp / ArrowDown focus traversal inside radiogroup without auto-selecting choices
  const handleRadioGroupKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    const buttons = radiogroupRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]:not(:disabled)'
    );
    if (!buttons || buttons.length === 0) return;

    e.preventDefault();
    const activeIdx = Array.from(buttons).findIndex((btn) => btn === document.activeElement);
    const nextIdx =
      e.key === 'ArrowDown'
        ? activeIdx < 0
          ? 0
          : (activeIdx + 1) % buttons.length
        : activeIdx <= 0
        ? buttons.length - 1
        : activeIdx - 1;
    buttons[nextIdx]?.focus();
  };

  return (
    <Card
      variant="flat"
      className="flex-1 flex flex-col p-4 sm:p-6 border-[1.5px] border-border bg-surface shadow-brutal-sm min-h-[460px]"
    >
      {/* Top Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b-[1.5px] border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="text-xs px-2.5 py-1 font-extrabold">
            Câu {currentIndex + 1} / {totalQuestions}
          </Badge>
          <span className="text-xs text-ink-muted font-mono font-bold bg-background px-2 py-0.5 rounded-sm border border-border/50">
            Vị trí #{question.position}
          </span>
          {question.groupId && (
            <Badge variant="outline" className="text-[11px] gap-1 font-semibold">
              <Layers className="h-3 w-3" aria-hidden="true" /> Nhóm câu hỏi
            </Badge>
          )}
          {validChoices.length === 3 && (
            <Badge variant="secondary" className="text-[11px] font-semibold">
              3 lựa chọn (A–C)
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant={isBookmarked ? 'primary' : 'outline'}
          size="sm"
          onClick={onToggleBookmark}
          disabled={disabled}
          aria-pressed={isBookmarked}
          className="text-xs gap-1.5"
          title="Đánh dấu câu hỏi để xem lại sau (Phím tắt: M hoặc F)"
        >
          {isBookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Đã đánh dấu (M)</span>
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Đánh dấu (M)</span>
            </>
          )}
        </Button>
      </div>

      {/* Main Question Content Area */}
      <div className="flex-1 mb-6 space-y-5">
        {/* Listening Audio Player */}
        {question.audioUrl && (
          <div className="p-3.5 sm:p-4 rounded-md bg-secondary/25 border-[1.5px] border-border space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-foreground uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Audio bài nghe TOEIC</span>
              </span>
            </div>
            {audioError ? (
              <div className="flex items-center gap-2 p-3 rounded-sm bg-destructive/30 border border-border text-xs font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Không thể tải tệp âm thanh cho câu hỏi này. Vui lòng kiểm tra kết nối mạng.</span>
              </div>
            ) : (
              <audio
                controls
                preload="metadata"
                src={question.audioUrl}
                onError={() => setAudioError(true)}
                className="w-full h-10"
              >
                Trình duyệt của bạn không hỗ trợ phát âm thanh.
              </audio>
            )}
          </div>
        )}

        {/* Question Image */}
        {question.imageUrl && (
          <div className="rounded-md border-[1.5px] border-border bg-background p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink-muted uppercase tracking-wider">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Hình ảnh minh họa</span>
            </div>
            {imageError ? (
              <div className="flex items-center justify-center gap-2 p-6 rounded-sm bg-surface border border-dashed border-border text-xs font-semibold text-ink-muted">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Không thể tải hình ảnh minh họa cho câu hỏi này.</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <img
                  src={question.imageUrl}
                  alt={`Hình minh họa câu ${currentIndex + 1}`}
                  onError={() => setImageError(true)}
                  className="max-h-[340px] w-auto object-contain rounded-sm border border-border/40 bg-surface"
                />
              </div>
            )}
          </div>
        )}

        {/* Split Layout for Passage Questions on Wide Viewports */}
        <div className={hasPassage ? 'grid grid-cols-1 xl:grid-cols-12 gap-5 items-start' : 'space-y-5'}>
          {hasPassage && (
            <div className="xl:col-span-6 p-4 sm:p-5 rounded-md bg-background border-[1.5px] border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Đoạn văn đọc hiểu</span>
              </div>
              <div className="font-serif text-[15px] sm:text-base text-foreground leading-relaxed whitespace-pre-wrap select-text xl:max-h-[540px] xl:overflow-y-auto pr-1">
                {question.passageText}
              </div>
            </div>
          )}

          <div className={hasPassage ? 'xl:col-span-6 space-y-4' : 'space-y-4'}>
            {/* Question Prompt (focus target when switching questions cleanly) */}
            <div
              ref={promptContainerRef}
              tabIndex={-1}
              className="p-4 sm:p-5 rounded-md bg-background/80 border-[1.5px] border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed whitespace-pre-wrap select-text">
                {question.prompt}
              </p>
            </div>

            {/* Answer Choices (Semantic Radio Group) */}
            <div
              ref={radiogroupRef}
              role="radiogroup"
              aria-label={`Các lựa chọn đáp án câu ${currentIndex + 1}`}
              onKeyDown={handleRadioGroupKeyDown}
              onFocusCapture={() => {
                wasRadioFocusedRef.current = true;
              }}
              onBlurCapture={(e) => {
                const related = e.relatedTarget as Node | null;
                if (!related || !radiogroupRef.current?.contains(related)) {
                  wasRadioFocusedRef.current = false;
                }
              }}
              className="space-y-3"
            >
              {validChoices.map((letter) => {
                const optionText = question.choices[letter];
                const isSelected = selectedChoice === letter;

                return (
                  <button
                    key={`${question.id}-${letter}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) onSelectChoice(letter);
                    }}
                    className={`w-full min-h-[52px] text-left flex items-start gap-3.5 p-3.5 sm:p-4 rounded-md border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-border bg-primary/35 shadow-brutal-sm'
                        : 'border-border bg-surface hover:bg-background'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-border font-mono text-xs font-black transition-colors ${
                        isSelected
                          ? 'bg-primary text-foreground'
                          : 'bg-background text-foreground'
                      }`}
                    >
                      {letter}
                    </span>
                    <span
                      className={`flex-1 pt-0.5 text-sm sm:text-base leading-relaxed select-text ${
                        isSelected ? 'font-bold text-foreground' : 'font-medium text-foreground'
                      }`}
                    >
                      {optionText}
                    </span>
                    {isSelected && (
                      <Badge variant="default" className="text-[10px] shrink-0 self-center">
                        Đã chọn
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-[1.5px] border-border mt-auto">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onPrev}
          disabled={!hasPrev || disabled}
          className="text-xs sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Câu trước</span>
        </Button>

        <span className="text-xs font-mono text-ink-muted hidden md:inline text-center">
          {validChoices.length === 3
            ? 'Phím A–C hoặc 1–3: Chọn đáp án'
            : 'Phím A–D hoặc 1–4: Chọn đáp án'}{' '}
          · Phím M/F: Đánh dấu · Phím ←/→: Chuyển câu
        </span>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!hasNext || disabled}
          className="text-xs sm:text-sm"
        >
          <span>Câu tiếp theo</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
