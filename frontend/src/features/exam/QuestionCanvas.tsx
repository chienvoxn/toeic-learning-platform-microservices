import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck, Headphones, Image as ImageIcon, BookOpen } from 'lucide-react';
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
}: QuestionCanvasProps) {
  // Only show choices that exist for this question (Part 2 has A, B, C; other parts have A, B, C, D)
  const allChoices: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const validChoices = allChoices.filter(
    (letter) => question.choices && question.choices[letter] !== undefined && question.choices[letter] !== null
  );

  return (
    <Card className="flex-1 flex flex-col p-6 shadow-sm border-slate-200 bg-white min-h-[460px]">
      {/* Top Question Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-xs px-2.5 py-1 font-bold">
            Câu {currentIndex + 1} / {totalQuestions}
          </Badge>
          <span className="text-xs text-slate-400 font-mono">
            Vị trí: #{question.position}
          </span>
          {validChoices.length === 3 && (
            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 font-semibold">
              3 phương án (A-C)
            </Badge>
          )}
        </div>

        <Button
          variant={isBookmarked ? 'secondary' : 'outline'}
          size="sm"
          onClick={onToggleBookmark}
          className={`text-xs gap-1.5 ${
            isBookmarked ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'text-slate-600'
          }`}
          title="Đánh dấu câu hỏi để xem lại sau (Phím tắt: B)"
        >
          {isBookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 text-amber-600" />
              <span>Đã lưu (B)</span>
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              <span>Đánh dấu (B)</span>
            </>
          )}
        </Button>
      </div>

      {/* Main Question Body */}
      <div className="space-y-4 mb-8 flex-1">
        {/* TOEIC Audio Player (if present) */}
        {question.audioUrl && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <Headphones className="h-4 w-4 text-blue-600" />
              <span>Audio bài nghe TOEIC</span>
            </div>
            <audio controls src={question.audioUrl} className="w-full h-10 rounded-lg">
              Trình duyệt của bạn không hỗ trợ phát âm thanh.
            </audio>
          </div>
        )}

        {/* TOEIC Photo / Image (if present, e.g. Part 1) */}
        {question.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col items-center p-3">
            <div className="w-full flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Hình ảnh minh họa Part 1</span>
            </div>
            <img
              src={question.imageUrl}
              alt="Hình ảnh câu hỏi TOEIC"
              className="max-h-[340px] w-auto object-contain rounded-lg shadow-xs"
            />
          </div>
        )}

        {/* TOEIC Reading Passage (if present, e.g. Part 6 & 7) */}
        {question.passageText && (
          <div className="p-5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <BookOpen className="h-4 w-4 text-amber-700" />
              <span>Đoạn văn đọc hiểu (Reading Passage)</span>
            </div>
            <div className="text-sm md:text-base text-slate-800 leading-relaxed font-serif whitespace-pre-wrap select-text bg-white/80 p-4 rounded-lg border border-amber-100">
              {question.passageText}
            </div>
          </div>
        )}

        {/* Question Prompt */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-base md:text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-wrap select-text">
            {question.prompt}
          </p>
        </div>

        {/* Choices List */}
        <div className="space-y-3 pt-2">
          {validChoices.map((letter) => {
            const optionText = question.choices[letter];
            const isSelected = selectedChoice === letter;

            return (
              <label
                key={letter}
                onClick={() => onSelectChoice(letter)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50/50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {letter}
                </div>
                <div className="flex-1 pt-0.5">
                  <span className={`text-sm md:text-base font-medium ${isSelected ? 'text-blue-950 font-semibold' : 'text-slate-800'}`}>
                    {optionText}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev}
          className="text-xs md:text-sm"
        >
          ← Câu trước (Phím ←)
        </Button>

        <span className="text-xs text-slate-400 hidden sm:inline">
          {validChoices.length === 3 ? 'Phím 1-3 hoặc A-C để chọn đáp án' : 'Phím 1-4 hoặc A-D để chọn đáp án'}
        </span>

        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          className="text-xs md:text-sm"
        >
          Câu tiếp theo (Phím →) →
        </Button>
      </div>
    </Card>
  );
}
