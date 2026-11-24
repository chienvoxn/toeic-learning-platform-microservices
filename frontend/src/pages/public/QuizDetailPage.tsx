import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { QuizDetail } from '@/types/quiz';
import { ContentReview } from '@/types/interaction';
import { AttemptView } from '@/types/attempt';
import { useAuth } from '@/features/auth/AuthContext';
import { formatPartName, isListeningPart } from '@/lib/utils';
import { ApiError } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/feedback/Alert';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Sparkles,
  Headphones,
  FileText,
  Star,
  Play,
  MessageSquare,
  ShieldCheck,
  Send
} from 'lucide-react';

export function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, hasPermission } = useAuth();

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Quiz Detail (Public endpoint)
  const {
    data: detail,
    isLoading: isQuizLoading,
    isError: isQuizError,
    error: quizError,
  } = useQuery<QuizDetail>({
    queryKey: ['quiz-detail', id],
    queryFn: () => apiRequest<QuizDetail>(`/ms/v1/contents/quizzes/${id}`),
    enabled: !!id,
  });

  // 2. Fetch Quiz Reviews (Public endpoint)
  const {
    data: reviews = [],
    isLoading: isReviewsLoading,
  } = useQuery<ContentReview[]>({
    queryKey: ['quiz-reviews', id],
    queryFn: () => apiRequest<ContentReview[]>(`/api/v1/interactions/contents/${id}/reviews`),
    enabled: !!id,
  });

  // 3. Start Exam Mutation
  const startMutation = useMutation({
    mutationFn: () =>
      apiRequest<AttemptView>('/ms/v1/attempts', {
        method: 'POST',
        body: JSON.stringify({ quizId: id }),
      }),
    onSuccess: (attempt) => {
      navigate(`/exam/${attempt.id}`);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 403) {
        setActionError('Đề thi này yêu cầu gói hội viên PRO. Vui lòng nâng cấp tài khoản để bắt đầu làm bài.');
      } else if (err instanceof ApiError && err.status === 429) {
        setActionError('Bạn đã dùng hết hạn ngạch lượt thi hôm nay. Hạn ngạch sẽ được làm mới sau 00:00 UTC.');
      } else if (err instanceof Error) {
        setActionError(err.message || 'Không thể khởi tạo lượt thi. Vui lòng thử lại sau.');
      } else {
        setActionError('Không thể khởi tạo lượt thi. Vui lòng thử lại sau.');
      }
    },
  });

  // 4. Submit Review Mutation
  const reviewMutation = useMutation({
    mutationFn: () =>
      apiRequest<ContentReview>(`/api/v1/interactions/contents/${id}/reviews/me`, {
        method: 'PUT',
        body: JSON.stringify({ stars, comment }),
      }),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['quiz-reviews', id] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setActionError(err.message || 'Gửi đánh giá thất bại.');
      } else {
        setActionError('Gửi đánh giá thất bại.');
      }
    },
  });

  const handleStartExam = () => {
    setActionError(null);
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/quizzes/${id}`)}`);
      return;
    }
    startMutation.mutate();
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    reviewMutation.mutate();
  };

  if (isQuizLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <SkeletonLoader className="h-8 w-40" />
        <SkeletonLoader className="h-48 w-full rounded-2xl" />
        <SkeletonLoader className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isQuizError || !detail) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Alert type="error" title="Không tìm thấy đề thi">
          {(quizError as Error)?.message || 'Đề thi không tồn tại hoặc đã bị ẩn bởi ban quản trị.'}
        </Alert>
        <Link to="/quizzes">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh mục đề
          </Button>
        </Link>
      </div>
    );
  }

  const { quiz, questions } = detail;
  const isListening = isListeningPart(quiz.part);

  // Compute average stars
  const avgStars = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.stars, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back link */}
      <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Trở về Danh mục đề thi
      </Link>

      {/* Action Notification Alert */}
      {actionError && (
        <Alert type="error" title="Thông báo hệ thống">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p>{actionError}</p>
            {actionError.includes('PRO') && (
              <Link to="/pricing">
                <Button size="sm" variant="primary" className="shrink-0 text-xs">
                  Xem gói PRO
                </Button>
              </Link>
            )}
          </div>
        </Alert>
      )}

      {/* Quiz Hero Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={isListening ? 'outline' : 'secondary'} className="gap-1 text-xs py-1 px-3">
              {isListening ? <Headphones className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              Part {quiz.part}
            </Badge>
            {quiz.premium ? (
              <Badge variant="pro" className="flex items-center gap-1 text-xs py-1 px-2.5">
                <Sparkles className="h-3 w-3" /> Gói PRO
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-slate-600 text-xs py-1 px-2.5">
                Miễn phí (FREE)
              </Badge>
            )}
          </div>

          {avgStars && (
            <div className="flex items-center gap-1 text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>{avgStars}</span>
              <span className="text-slate-400 font-normal text-xs">({reviews.length} đánh giá)</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {quiz.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {formatPartName(quiz.part)}
          </p>
        </div>

        {/* Info stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Số lượng câu hỏi
            </div>
            <p className="text-lg font-bold text-slate-900">{questions.length} câu</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-primary" /> Thời gian ước tính
            </div>
            <p className="text-lg font-bold text-slate-900">~{Math.round(questions.length * 1.2)} phút</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Hình thức chấm
            </div>
            <p className="text-lg font-bold text-emerald-700">Tự động 100%</p>
          </div>
        </div>

        {/* Call to action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
          <Button
            size="lg"
            className="w-full sm:w-auto h-12 px-8 text-base gap-2 font-bold shadow-md"
            onClick={handleStartExam}
            isLoading={startMutation.isPending}
          >
            <Play className="h-5 w-5 fill-current" /> Bắt đầu làm bài ngay
          </Button>
          {!isAuthenticated && (
            <span className="text-xs text-slate-500">
              Chưa đăng nhập? Bạn sẽ được chuyển tới trang đăng nhập an toàn.
            </span>
          )}
        </div>
      </div>

      {/* Question Previews (Questions without answers per contract) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Xem Trước Cấu Trúc Câu Hỏi ({questions.length})
          </h3>
          <span className="text-xs text-slate-400">Đáp án đúng chỉ hiển thị sau khi nộp bài</span>
        </div>

        <div className="space-y-4">
          {questions.slice(0, 5).map((q, index) => (
            <Card key={q.id} className="p-5 border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-blue-50 text-primary font-bold text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pl-8">
                  {Object.entries(q.choices).map(([key, val]) => (
                    <div key={key} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <span className="font-bold text-slate-400">{key}.</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          {questions.length > 5 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
              + Còn {questions.length - 5} câu hỏi nữa trong bài thi chính thức.
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Đánh Giá & Nhận Xét ({reviews.length})
          </h3>
        </div>

        {/* Submit Review Form */}
        {isAuthenticated && hasPermission('interaction:write') ? (
          <form onSubmit={handleSubmitReview} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Gửi nhận xét của bạn cho đề thi này</h4>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Đánh giá số sao:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStars(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận về độ khó, chất lượng câu hỏi hoặc bẫy ngữ pháp của đề thi này..."
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              required
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="gap-1.5"
                isLoading={reviewMutation.isPending}
              >
                <Send className="h-3.5 w-3.5" /> Gửi đánh giá
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Đăng nhập tài khoản học viên để gửi nhận xét và chấm sao cho đề thi.</span>
            <Link to={`/login?redirect=/quizzes/${id}`}>
              <Button variant="outline" size="sm" className="text-xs">Đăng nhập</Button>
            </Link>
          </div>
        )}

        {/* Reviews List */}
        {isReviewsLoading ? (
          <SkeletonLoader className="h-24 w-full rounded-xl" />
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl">
            Chưa có đánh giá nào cho đề thi này. Hãy là người đầu tiên làm bài và gửi nhận xét!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.reviewId} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-800">Thí sinh</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
