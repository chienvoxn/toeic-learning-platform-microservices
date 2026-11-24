import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseQuestionCsv, CsvParseResult } from './csvParser';
import { QuestionInput } from '@/types/quiz';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X, Download } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (questions: QuestionInput[]) => void;
}

export function CsvImportModal({ isOpen, onClose, onImportSuccess }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <Card className="max-w-3xl w-full p-6 shadow-2xl border-slate-200 bg-white space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Nhập Câu Hỏi Hàng Loạt Từ Tệp CSV</h3>
              <p className="text-xs text-slate-500">Hỗ trợ định dạng chuẩn: prompt, a, b, c, d, answer, explanation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Chọn tệp .csv từ máy tính
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={downloadSample}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Tải tệp CSV mẫu
            </Button>
          </div>

          {/* Text Area for manual paste */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Hoặc dán nội dung CSV trực tiếp vào đây:
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Dán nội dung CSV tại đây..."
              className="w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Parse Validation Results */}
          {parseResult && (
            <div className="space-y-3 pt-2">
              {parseResult.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Phát hiện {parseResult.errors.length} lỗi trong dữ liệu:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-28 overflow-y-auto pl-2">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parseResult.questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Tìm thấy {parseResult.questions.length} câu hỏi hợp lệ
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Xem trước {Math.min(parseResult.questions.length, 3)} câu đầu
                    </Badge>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                    {parseResult.questions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-slate-100 text-xs space-y-1">
                        <p className="font-semibold text-slate-900 truncate">
                          #{idx + 1}: {q.prompt}
                        </p>
                        <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-600">
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

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!parseResult || parseResult.questions.length === 0}
            onClick={handleConfirm}
          >
            Nhập {parseResult?.questions.length || 0} câu hỏi vào đề
          </Button>
        </div>
      </Card>
    </div>
  );
}
