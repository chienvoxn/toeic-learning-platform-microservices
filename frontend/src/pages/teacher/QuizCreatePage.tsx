import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { QuizInput, DraftDetail } from '@/types/quiz';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/feedback/Alert';
import { BookPlus, ArrowRight, ArrowLeft } from 'lucide-react';

export function QuizCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [part, setPart] = useState(5);
  const [premium, setPremium] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createDraftMutation = useMutation({
    mutationFn: (quizData: QuizInput) =>
      apiRequest<DraftDetail>('/ms/v1/contents/quizzes/drafts', {
        method: 'POST',
        body: JSON.stringify(quizData),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
      // Redirect to the newly created draft editor
      navigate(`/teacher/quizzes/${data.quiz.id}/edit`, { replace: true });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Tạo bản nháp thất bại.';
      setErrorMessage(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề cho đề thi.');
      return;
    }

    createDraftMutation.mutate({
      title: title.trim(),
      part,
      premium,
      questions: [], // Start with empty questions in draft
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/quizzes')}
          className="text-slate-600"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        <h1 className="text-xl font-bold text-slate-900">Khởi Tạo Đề Thi Mới (Bản Nháp)</h1>
      </div>

      <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-6">
        <div className="space-y-1 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <BookPlus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Thông Tin Tổng Quan Đề Thi</h2>
          </div>
          <p className="text-xs text-slate-500">
            Khởi tạo đề thi ở trạng thái bản nháp (Draft). Bạn có thể thêm câu hỏi thủ công hoặc nhập từ CSV ở bước tiếp theo.
          </p>
        </div>

        {errorMessage && (
          <Alert type="error" title="Lỗi khởi tạo">
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Tiêu đề đề thi <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="VD: TOEIC Practice Test 2026 - Part 5 Incomplete Sentences #01"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm font-medium"
              maxLength={255}
              required
            />
            <p className="text-[11px] text-slate-400">Tối đa 255 ký tự</p>
          </div>

          {/* Part Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Phần thi TOEIC (Part 1 - 7)
            </label>
            <select
              value={part}
              onChange={(e) => setPart(Number(e.target.value))}
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value={1}>Part 1 — Photographs (Mô tả hình ảnh)</option>
              <option value={2}>Part 2 — Question & Response (Hỏi đáp)</option>
              <option value={3}>Part 3 — Short Conversations (Đoạn hội thoại)</option>
              <option value={4}>Part 4 — Short Talks (Bài nói ngắn)</option>
              <option value={5}>Part 5 — Incomplete Sentences (Điền vào câu)</option>
              <option value={6}>Part 6 — Text Completion (Điền đoạn văn)</option>
              <option value={7}>Part 7 — Reading Comprehension (Đọc hiểu)</option>
            </select>
          </div>

          {/* Premium Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={premium}
                onChange={(e) => setPremium(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Dành riêng cho gói PRO</span>
                  <Badge variant="pro" className="text-[10px]">PRO</Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Khi bật, chỉ học viên đã nâng cấp gói thành viên PRO mới có quyền bắt đầu làm đề này.
                </p>
              </div>
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/teacher/quizzes')}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createDraftMutation.isPending}
            >
              {createDraftMutation.isPending ? 'Đang tạo bản nháp...' : 'Tạo bản nháp & Soạn câu hỏi'}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
