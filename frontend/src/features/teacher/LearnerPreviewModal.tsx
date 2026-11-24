import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuestionInput } from '@/types/quiz';
import {
  Eye,
  X,
  CheckCircle2,
  HelpCircle,
  Headphones,
  BookOpen,
  ChevronRight,
  ChevronLeft
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

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];
  const isListening = part >= 1 && part <= 4;
  const isSelected = (choice: string) => selectedChoices[currentIdx] === choice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{title || 'Đề thi không có tiêu đề'}</span>
                <Badge variant={premium ? 'pro' : 'outline'} className="text-[10px]">
                  {premium ? 'PRO' : 'FREE'}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Chế độ xem trước của Học viên (Zero Quota)
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Part {part} • {questions.length} câu hỏi • Không tiêu tốn lượt thi thực tế</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Body / Exam Simulation Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Đề thi chưa có câu hỏi nào để hiển thị xem trước.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Question Navigation Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Câu hỏi {currentIdx + 1} / {questions.length}
                  </span>
                  {isListening ? (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50 text-[10px] gap-1">
                      <Headphones className="h-3 w-3" /> Listening
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50/50 text-[10px] gap-1">
                      <BookOpen className="h-3 w-3" /> Reading
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIdx === 0}
                    onClick={() => {
                      setCurrentIdx((prev) => prev - 1);
                      setShowExplanation(false);
                    }}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Câu trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIdx === questions.length - 1}
                    onClick={() => {
                      setCurrentIdx((prev) => prev + 1);
                      setShowExplanation(false);
                    }}
                    className="h-8 px-2.5 text-xs"
                  >
                    Câu sau <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Media Preview (Audio / Image / Passage) */}
              {currentQ.audioUrl && (
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">Audio bài nghe TOEIC:</span>
                  <audio controls src={currentQ.audioUrl} className="w-full h-8" />
                </div>
              )}
              {currentQ.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-64 flex justify-center bg-slate-50 p-2">
                  <img src={currentQ.imageUrl} alt="Ảnh câu hỏi" className="max-h-60 object-contain rounded-lg" />
                </div>
              )}
              {currentQ.passageText && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs md:text-sm font-serif whitespace-pre-wrap text-slate-800">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block font-sans mb-1">Đoạn văn đọc hiểu:</span>
                  {currentQ.passageText}
                </div>
              )}

              {/* Question Prompt */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đề bài</span>
                <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                  {currentQ.prompt || '(Chưa nhập nội dung câu hỏi)'}
                </p>
              </div>

              {/* Choices (A, B, C, and conditionally D) */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Lựa chọn câu trả lời {part === 2 ? '(Part 2: 3 lựa chọn A-C)' : ''}
                </span>
                {(part === 2 ? (['A', 'B', 'C'] as const) : (['A', 'B', 'C', 'D'] as const)).map((choiceKey) => {
                  const choiceText = currentQ[choiceKey.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
                  const selected = isSelected(choiceKey);
                  const isCorrect = currentQ.answer === choiceKey;

                  return (
                    <button
                      key={choiceKey}
                      type="button"
                      onClick={() => setSelectedChoices({ ...selectedChoices, [currentIdx]: choiceKey })}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border text-left text-sm font-medium transition-all',
                        selected
                          ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div
                        className={cn(
                          'h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border transition-colors',
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        )}
                      >
                        {choiceKey}
                      </div>
                      <span className="flex-1 text-xs sm:text-sm">{choiceText || `(Lựa chọn ${choiceKey} trống)`}</span>
                      {showExplanation && isCorrect && (
                        <Badge variant="success" className="text-[10px] ml-auto">
                          Đáp án đúng
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Toggle Answer & Explanation for Teacher verification */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="gap-2 text-xs text-slate-700 border-dashed"
                >
                  <HelpCircle className="h-4 w-4 text-primary" />
                  {showExplanation ? 'Ẩn đáp án & giải thích' : 'Hiện đáp án & giải thích kiểm tra'}
                </Button>

                {showExplanation && (
                  <div className="mt-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Đáp án đúng được cài đặt: ({currentQ.answer})</span>
                    </div>
                    <div className="text-slate-700 leading-relaxed">
                      <strong>Giải thích ngữ pháp:</strong> {currentQ.explanation || '(Chưa có giải thích)'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Xem trước tương thích thiết bị di động & máy tính</span>
          <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
            Đóng xem trước
          </Button>
        </div>
      </div>
    </div>
  );
}
