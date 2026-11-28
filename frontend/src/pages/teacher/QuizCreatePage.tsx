import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { QuizInput, DraftDetail } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Badge } from '@/components/atoms/Badge';
import { Alert } from '@/components/molecules/Alert';
import { BookPlus, ArrowRight, ArrowLeft, Info } from 'lucide-react';

const PART_SPECS: Record<number, { label: string; note: string }> = {
  1: {
    label: 'Part 1 — Photographs (Mô tả hình ảnh)',
    note: 'Phần Listening: cần có file âm thanh (audio), hình ảnh minh họa (image) và 4 lựa chọn A–D.',
  },
  2: {
    label: 'Part 2 — Question & Response (Hỏi đáp)',
    note: 'Phần Listening: cần có file âm thanh (audio) và đúng 3 lựa chọn A, B, C.',
  },
  3: {
    label: 'Part 3 — Short Conversations (Đoạn hội thoại)',
    note: 'Phần Listening: cần có file âm thanh (audio) và 4 lựa chọn A–D.',
  },
  4: {
    label: 'Part 4 — Short Talks (Bài nói ngắn)',
    note: 'Phần Listening: cần có file âm thanh (audio) và 4 lựa chọn A–D.',
  },
  5: {
    label: 'Part 5 — Incomplete Sentences (Điền vào câu)',
    note: 'Phần Reading: câu hỏi trắc nghiệm 4 lựa chọn A–D và lời giải thích chi tiết.',
  },
  6: {
    label: 'Part 6 — Text Completion (Điền đoạn văn)',
    note: 'Phần Reading: hỗ trợ nhập đoạn văn đọc hiểu (passage) cùng 4 lựa chọn A–D.',
  },
  7: {
    label: 'Part 7 — Reading Comprehension (Đọc hiểu)',
    note: 'Phần Reading: hỗ trợ đoạn văn đọc hiểu nhiều thông tin cùng 4 lựa chọn A–D.',
  },
};

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

    setErrorMessage(null);
    createDraftMutation.mutate({
      title: title.trim(),
      part,
      premium,
      questions: [],
    });
  };

  const selectedSpec = PART_SPECS[part] || PART_SPECS[5];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/teacher/quizzes')}
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Khởi tạo bản nháp đề thi mới
            </h1>
            <p className="text-xs text-ink-muted">
              Bước 1: Thiết lập thông tin cơ bản trước khi vào trình biên soạn câu hỏi
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-secondary text-foreground">
          Bản nháp mới
        </Badge>
      </div>

      <Card variant="default" className="p-6 space-y-6">
        <div className="flex items-start gap-3 border-b border-border/20 pb-4">
          <div className="p-2.5 rounded-md bg-secondary text-foreground border border-border shrink-0">
            <BookPlus className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-foreground">Thông tin tổng quan đề thi</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Đề thi sẽ được lưu ở trạng thái bản nháp (Draft). Ở bước tiếp theo, bạn có thể nhập từng câu hỏi, tải tệp âm thanh/hình ảnh hoặc nhập hàng loạt từ CSV.
            </p>
          </div>
        </div>

        {errorMessage && (
          <Alert type="error" title="Không thể khởi tạo bản nháp">
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="quiz-create-title" className="text-sm font-bold text-foreground">
                Tiêu đề đề thi <span className="text-foreground font-extrabold" aria-hidden="true">*</span>
              </label>
              <span className="font-mono text-xs text-ink-muted">{title.length}/255</span>
            </div>
            <Input
              id="quiz-create-title"
              placeholder="VD: TOEIC Practice Test 2026 - Part 5 Incomplete Sentences #01"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              maxLength={255}
              required
            />
          </div>

          {/* Part Selection */}
          <div className="space-y-2">
            <Select
              id="quiz-create-part"
              label="Phần thi TOEIC (Part 1–7)"
              value={String(part)}
              onChange={(e) => setPart(Number(e.target.value))}
              options={[1, 2, 3, 4, 5, 6, 7].map((p) => ({
                value: String(p),
                label: PART_SPECS[p].label,
              }))}
            />
            <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-xs text-ink-muted">
              <Info className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
              <span>{selectedSpec.note}</span>
            </div>
          </div>

          {/* Premium Toggle */}
          <div className="pt-1">
            <label className="flex items-start gap-3 p-4 rounded-md border-[1.5px] border-border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={premium}
                onChange={(e) => setPremium(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Dành riêng cho hội viên PRO</span>
                  <Badge variant="pro" className="text-[11px]">PRO</Badge>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Khi bật tùy chọn này, chỉ tài khoản đang sử dụng gói PRO mới có quyền bắt đầu làm bài thi này.
                </p>
              </div>
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-border/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/teacher/quizzes')}
              disabled={createDraftMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createDraftMutation.isPending}
            >
              {createDraftMutation.isPending ? 'Đang tạo bản nháp...' : 'Tạo bản nháp & soạn câu hỏi'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
