import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { QuizView } from '@/types/quiz';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/feedback/Alert';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  BookOpen, 
  Calendar,
  HelpCircle
} from 'lucide-react';

export function ExamResultDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  // 1. Fetch Graded Attempt Detail
  const {
    data: attempt,
    isLoading: isAttemptLoading,
    isError: isAttemptError,
    error: attemptError,
  } = useQuery<AttemptView>({
    queryKey: ['attempt-result', attemptId],
    queryFn: () => apiRequest<AttemptView>(`/ms/v1/attempts/${attemptId}`),
    enabled: !!attemptId,
  });

  // 2. Fetch Quizzes to get the quiz title
  const { data: quizzes = [] } = useQuery<QuizView[]>({
    queryKey: ['public-quizzes'],
    queryFn: () => apiRequest<QuizView[]>('/ms/v1/contents/quizzes'),
    staleTime: 1000 * 60 * 10,
  });

  const quiz = quizzes.find((q) => q.id === attempt?.quizId);

  if (isAttemptLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-6 w-32" />
        <SkeletonLoader className="h-44 w-full rounded-2xl" />
        <SkeletonLoader className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isAttemptError || !attempt) {
    return (
      <div className="space-y-4 py-8 text-center max-w-lg mx-auto">
        <Alert type="error" title="Không tìm thấy bài thi">
          {(attemptError as Error)?.message || 'Lượt thi này không tồn tại hoặc bạn không có quyền xem.'}
        </Alert>
        <Link to="/learner/history">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại lịch sử thi
          </Button>
        </Link>
      </div>
    );
  }

  const isGraded = attempt.status === 'GRADED';
  const percentage = isGraded && attempt.total > 0
    ? Math.round(((attempt.correct || 0) / attempt.total) * 100)
    : 0;

  const getEvaluationTag = () => {
    if (percentage >= 85) return { label: 'Xuất sắc', color: 'bg-emerald-500 text-white' };
    if (percentage >= 70) return { label: 'Tốt', color: 'bg-blue-600 text-white' };
    if (percentage >= 50) return { label: 'Đạt yêu cầu', color: 'bg-amber-500 text-white' };
    return { label: 'Cần ôn luyện thêm', color: 'bg-rose-500 text-white' };
  };

  const evaluation = getEvaluationTag();

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link to="/learner/history" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Trở về Lịch sử luyện đề
      </Link>

      {/* Score Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-center md:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <Badge className={evaluation.color}>{evaluation.label}</Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(attempt.createdAt).toLocaleDateString('vi-VN')} {new Date(attempt.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {quiz?.title || 'Bài Thi TOEIC'}
          </h2>
          <p className="text-xs text-slate-500">
            Mã lượt thi: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">{attempt.id}</code>
          </p>
        </div>

        {/* Big Score Card */}
        <div className="flex items-center gap-5 p-5 bg-blue-50/70 border border-blue-200/60 rounded-2xl shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xs">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Điểm số đạt được</span>
            <div className="text-3xl font-black text-slate-900">
              {attempt.correct ?? 0} <span className="text-base font-normal text-slate-500">/ {attempt.total} câu</span>
            </div>
            <p className="text-xs font-semibold text-primary">{percentage}% câu trả lời chính xác</p>
          </div>
        </div>
      </div>

      {/* If still IN_PROGRESS alert */}
      {!isGraded && (
        <Alert type="warning" title="Bài thi chưa nộp">
          <div className="flex items-center justify-between gap-4">
            <span>Bài thi này đang ở trạng thái làm dở. Các câu trả lời chưa được chấm điểm chính thức.</span>
            <Link to={`/exam/${attempt.id}`}>
              <Button size="sm" variant="primary">Tiếp tục làm bài</Button>
            </Link>
          </div>
        </Alert>
      )}

      {/* Detailed Question Review List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Phân Tích Chi Tiết Từng Câu Hỏi ({attempt.questions.length})
          </h3>
          <span className="text-xs text-slate-400">Xem lời giải ngữ pháp và từ vựng</span>
        </div>

        <div className="space-y-5">
          {attempt.questions.map((q) => {
            const isCorrect = q.correct === true;
            const isUnanswered = !q.selectedChoice;

            return (
              <Card
                key={q.id}
                className={`p-6 border transition-all bg-white ${
                  isUnanswered
                    ? 'border-slate-200'
                    : isCorrect
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="space-y-4">
                  {/* Question Prompt */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isUnanswered
                          ? 'bg-slate-100 text-slate-600'
                          : isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {q.position}
                      </span>
                      <div className="space-y-3 flex-1">
                        {/* Audio preview in review */}
                        {q.audioUrl && (
                          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
                            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">Nghe lại Audio câu hỏi:</span>
                            <audio controls src={q.audioUrl} className="w-full h-8" />
                          </div>
                        )}
                        {/* Image preview in review */}
                        {q.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 max-h-64 flex justify-center bg-slate-50 p-2">
                            <img src={q.imageUrl} alt="Ảnh câu hỏi" className="max-h-60 object-contain rounded-lg" />
                          </div>
                        )}
                        {/* Passage text in review */}
                        {q.passageText && (
                          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs md:text-sm font-serif whitespace-pre-wrap text-slate-800">
                            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block font-sans mb-1">Đoạn văn đọc hiểu:</span>
                            {q.passageText}
                          </div>
                        )}
                        <p className="text-base font-semibold text-slate-900 leading-relaxed">
                          {q.prompt}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnanswered ? (
                        <Badge variant="outline" className="text-slate-500">Chưa trả lời</Badge>
                      ) : isCorrect ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-4 w-4" /> Chính xác
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <XCircle className="h-4 w-4" /> Chưa đúng
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4 Choices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-10">
                    {Object.entries(q.choices).map(([choiceKey, choiceText]) => {
                      const isSelected = q.selectedChoice === choiceKey;

                      let choiceStyle = 'border-slate-200 bg-slate-50/60 text-slate-700';
                      if (isSelected) {
                        choiceStyle = isCorrect
                          ? 'border-emerald-500 bg-emerald-100/70 text-emerald-900 font-bold'
                          : 'border-rose-500 bg-rose-100/70 text-rose-900 font-bold';
                      }

                      return (
                        <div
                          key={choiceKey}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${choiceStyle}`}
                        >
                          <span className={`h-6 w-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white shadow-xs' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {choiceKey}
                          </span>
                          <span className="leading-snug">{choiceText}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Official Explanation Box (Available when graded) */}
                  {q.explanation && (
                    <div className="ml-10 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <HelpCircle className="h-3.5 w-3.5" /> Giải thích đáp án:
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-slate-600">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
