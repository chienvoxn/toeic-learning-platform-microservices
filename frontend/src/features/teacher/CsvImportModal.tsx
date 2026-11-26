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
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (questions: QuestionInput[]) => void;
}

export function CsvImportModal({ isOpen, onClose, onImportSuccess }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Nhập Câu Hỏi Hàng Loạt Từ Tệp CSV</DialogTitle>
              <DialogDescription>Hỗ trợ định dạng chuẩn: prompt, a, b, c, d, answer, explanation</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,text/csv"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold gap-1.5"
            >
              <FileText className="h-4 w-4 text-blue-600" /> Chọn tệp CSV từ máy tính
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadSample}
              className="text-xs text-slate-600 hover:text-blue-600 gap-1"
            >
              <Download className="h-3.5 w-3.5" /> Tải tệp mẫu (.csv)
            </Button>
          </div>

          {/* Text Area Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Hoặc dán trực tiếp nội dung CSV vào đây:</label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`prompt,a,b,c,d,answer,explanation\n"Question...","A","B","C","D","A","Explanation..."`}
              className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Parse Result Summary */}
          {parseResult && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Kết quả phân tích:</span>
                <div className="flex gap-2">
                  <Badge variant={parseResult.questions.length > 0 ? 'success' : 'destructive'} className="text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> {parseResult.questions.length} câu hợp lệ
                  </Badge>
                  {parseResult.errors.length > 0 && (
                    <Badge variant="warning" className="text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> {parseResult.errors.length} cảnh báo
                    </Badge>
                  )}
                </div>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1 max-h-28 overflow-y-auto">
                  {parseResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {parseResult.questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Xem trước {Math.min(parseResult.questions.length, 3)} câu đầu:
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {Math.min(parseResult.questions.length, 3)} / {parseResult.questions.length} câu
                    </Badge>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                    {parseResult.questions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-md border border-slate-200/80 text-xs space-y-1 shadow-2xs">
                        <p className="font-semibold text-slate-900 truncate">
                          #{idx + 1}: {q.prompt}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-600">
                          <span className={q.answer === 'A' ? 'font-bold text-blue-600' : ''}>A: {q.a}</span>
                          <span className={q.answer === 'B' ? 'font-bold text-blue-600' : ''}>B: {q.b}</span>
                          <span className={q.answer === 'C' ? 'font-bold text-blue-600' : ''}>C: {q.c}</span>
                          <span className={q.answer === 'D' ? 'font-bold text-blue-600' : ''}>D: {q.d}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
