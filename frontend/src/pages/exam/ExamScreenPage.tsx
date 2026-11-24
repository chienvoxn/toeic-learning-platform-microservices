import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function ExamScreenPage() {
  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6">
      {/* Question Canvas */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-800">Câu 1 / 30</span>
          <div className="flex items-center gap-2 text-primary font-bold">
            <Clock className="h-4 w-4" /> 71:45
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Incomplete Sentence</span>
            <p className="text-base font-medium text-slate-900">
              Ms. Tanaka requested that all department managers _______ their quarterly budgets before Friday.
            </p>
          </div>

          <div className="space-y-2.5">
            {['A. submit', 'B. submitting', 'C. submitted', 'D. submits'].map((choice, i) => (
              <label
                key={i}
                className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-colors"
              >
                <input type="radio" name="choice" className="h-4 w-4 text-primary" />
                <span className="text-sm text-slate-800 font-medium">{choice}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Navigation Palette */}
      <div className="w-full md:w-72 space-y-4">
        <Card className="p-4 space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">Bảng câu hỏi</h4>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 30 }, (_, i) => (
              <button
                key={i}
                className={`h-9 rounded-lg text-xs font-semibold border ${
                  i === 0
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button variant="primary" className="w-full">
            Nộp bài thi
          </Button>
        </Card>
      </div>
    </div>
  );
}
