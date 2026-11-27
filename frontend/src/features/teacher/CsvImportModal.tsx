import { useState, useRef } from 'react';
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
import { parseQuestionCsv, CsvParseResult } from './csvParser';
import { QuestionInput } from '@/types/quiz';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Download, RotateCcw } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (questions: QuestionInput[]) => void;
}

export function CsvImportModal({ isOpen, onClose, onImportSuccess }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleClearCsv = () => {
    setCsvText('');
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      const parsed = parseQuestionCsv(content);
      setParseResult(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (text.trim().length > 0) {
      const parsed = parseQuestionCsv(text);
      setParseResult(parsed);
    } else {
      setParseResult(null);
    }
  };

  const handleConfirm = () => {
    if (parseResult && parseResult.questions.length > 0) {
      onImportSuccess(parseResult.questions);
      handleClearCsv();
      onClose();
    }
  };

  const sampleCsv = `prompt,a,b,c,d,answer,explanation
"Ms. Tanaka requested that all department managers _______ their quarterly budgets before Friday.","submit","submitting","submitted","submits","A","Sau cấu trúc yêu cầu request that + S + (should) + V nguyên mẫu nên chọn submit."
"Due to heavy traffic on Highway 10, the morning delivery was delayed by _______ thirty minutes.","nearly","near","nearest","nearing","A","Phó từ nearly đứng trước cụm số lượng để chỉ sự xấp xỉ gần đúng."`;

  const downloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_cau_hoi_toeic.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-secondary border border-border text-foreground shrink-0">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Nhập câu hỏi hàng loạt từ tệp CSV</DialogTitle>
              <DialogDescription>
                Hỗ trợ định dạng chuẩn: prompt, a, b, c, [d], answer, explanation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-background p-3 rounded-md border-[1.5px] border-border">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Chọn tệp CSV từ máy tính"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold"
              >
                <FileText className="h-4 w-4" /> Chọn tệp CSV từ máy tính
              </Button>
              {csvText.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCsv}
                  className="text-xs font-bold"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Xóa nội dung
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadSample}
              className="text-xs font-bold"
            >
              <Download className="h-3.5 w-3.5" /> Tải tệp mẫu (.csv)
            </Button>
          </div>

          {/* Text Area Input */}
          <div className="space-y-1.5">
            <label htmlFor="csv-raw-textarea" className="text-xs font-extrabold text-foreground block">
              Hoặc dán trực tiếp nội dung CSV vào đây:
            </label>
            <textarea
              id="csv-raw-textarea"
              rows={6}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`prompt,a,b,c,d,answer,explanation\n"Question...","A","B","C","D","A","Explanation..."`}
              className="w-full rounded-md border-[1.5px] border-border bg-surface p-3 font-mono text-xs text-foreground placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Parse Result Summary */}
          {parseResult && (
            <div className="space-y-3 pt-3 border-t border-border/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold text-foreground">Kết quả phân tích:</span>
                <div className="flex gap-2">
                  <Badge variant={parseResult.questions.length > 0 ? 'success' : 'destructive'} className="text-[11px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> {parseResult.questions.length} câu hợp lệ
                  </Badge>
                  {parseResult.errors.length > 0 && (
                    <Badge variant="warning" className="text-[11px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> {parseResult.errors.length} cảnh báo
                    </Badge>
                  )}
                </div>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="bg-warning/40 p-3 rounded-md border-[1.5px] border-border text-xs text-foreground space-y-1 max-h-28 overflow-y-auto">
                  {parseResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {parseResult.questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Xem trước {Math.min(parseResult.questions.length, 3)} câu đầu:
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {Math.min(parseResult.questions.length, 3)} / {parseResult.questions.length} câu
                    </Badge>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 border-[1.5px] border-border rounded-md p-2.5 bg-background">
                    {parseResult.questions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="p-2.5 bg-surface rounded-sm border border-border text-xs space-y-1.5">
                        <p className="font-bold text-foreground truncate">
                          #{idx + 1}: {q.prompt}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-ink-muted">
                          <span className={q.answer === 'A' ? 'font-extrabold text-foreground underline' : ''}>
                            A: {q.a}
                          </span>
                          <span className={q.answer === 'B' ? 'font-extrabold text-foreground underline' : ''}>
                            B: {q.b}
                          </span>
                          <span className={q.answer === 'C' ? 'font-extrabold text-foreground underline' : ''}>
                            C: {q.c}
                          </span>
                          {q.d ? (
                            <span className={q.answer === 'D' ? 'font-extrabold text-foreground underline' : ''}>
                              D: {q.d}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border/20">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!parseResult || parseResult.questions.length === 0}
          >
            Nhập {parseResult?.questions.length || 0} câu hỏi vào đề
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
