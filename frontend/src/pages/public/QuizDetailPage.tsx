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
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Card } from '@/components/atoms/Card';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { Alert } from '@/components/molecules/Alert';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Headphones,
  FileText,
  Star,
  Play,
  MessageSquare,
  ShieldCheck,
  Send,
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <SkeletonLoader className="h-8 w-44" />
        <SkeletonLoader className="h-56 w-full rounded-lg" />
        <SkeletonLoader className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isQuizError || !detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <Alert type="error" title="Không tìm thấy đề thi">
          {(quizError as Error)?.message || 'Đề thi không tồn tại hoặc chưa được công khai.'}
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

  const avgStars = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.stars, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back link */}
      <Link
        to="/quizzes"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Trở về danh mục đề thi
      </Link>

      {/* Action Error Alert */}
      {actionError && (
        <Alert type="error" title="Thông báo hệ thống">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p>{actionError}</p>
            {actionError.includes('PRO') && (
              <Link to="/pricing">
                <Button size="sm" variant="primary" className="shrink-0">
                  Xem gói PRO
                </Button>
              </Link>
            )}
          </div>
        </Alert>
      )}

      {/* Exam Briefing Dossier Card */}
      <Card variant="elevated" className="p-0 overflow-hidden">
        <div className="bg-background border-b-2 border-border px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isListening ? 'secondary' : 'outline'} className="gap-1.5 font-mono">
              {isListening ? <Headphones className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              Part {quiz.part} · {isListening ? 'Listening' : 'Reading'}
            </Badge>
            {quiz.premium ? (
              <Badge variant="pro">Gói PRO</Badge>
            ) : (
              <Badge variant="outline" className="font-mono">
                Miễn phí (FREE)
              </Badge>
            )}
          </div>

          {avgStars && (
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground bg-warning px-2.5 py-1 rounded-sm border border-border">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{avgStars}</span>
              <span className="text-ink-muted font-normal">({reviews.length} đánh giá)</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-6 bg-surface">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Thông tin đề thi · Part {quiz.part}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {quiz.title}
            </h1>
            <p className="text-sm text-ink-muted font-medium">{formatPartName(quiz.part)}</p>
          </div>

          {/* Monospace Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-md bg-background border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                <BookOpen className="h-3.5 w-3.5" /> Số lượng câu hỏi
              </div>
              <p className="font-mono text-xl font-black text-foreground">{questions.length} câu</p>
            </div>
            <div className="p-4 rounded-md bg-background border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                <Clock className="h-3.5 w-3.5" /> Thời lượng gợi ý
              </div>
              <p className="font-mono text-xl font-black text-foreground">
                ~{Math.round(questions.length * 1.2)} phút
              </p>
            </div>
            <div className="p-4 rounded-md bg-success/40 border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                <ShieldCheck className="h-3.5 w-3.5" /> Hình thức chấm
              </div>
              <p className="font-mono text-xl font-black text-foreground">Tự động</p>
            </div>
          </div>

          {/* Primary Start CTA */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 border-t border-border/20">
            <Button
              size="lg"
              variant="primary"
              className="w-full sm:w-auto px-8 gap-2"
              onClick={handleStartExam}
              isLoading={startMutation.isPending}
            >
              <Play className="h-5 w-5 fill-current" /> Bắt đầu làm bài ngay
            </Button>
            {!isAuthenticated && (
              <span className="text-xs text-ink-muted">
                Chưa đăng nhập? Bạn sẽ được chuyển tới trang đăng nhập trước khi tạo lượt thi.
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Question Previews */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/20 pb-3">
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" /> Xem trước cấu trúc câu hỏi ({questions.length})
          </h2>
          <span className="text-xs font-semibold text-ink-muted">
            Đáp án đúng chỉ hiển thị sau khi nộp bài
          </span>
        </div>

        <div className="space-y-4">
          {questions.slice(0, 5).map((q, index) => (
            <Card key={q.id} variant="flat" className="p-5">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="font-mono h-6 w-7 rounded-sm bg-primary border border-border text-foreground font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm font-bold text-foreground leading-relaxed">{q.prompt}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground sm:pl-10">
                  {Object.entries(q.choices).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2.5 rounded-sm bg-background border border-border/40 flex items-start gap-2"
                    >
                      <span className="font-mono font-bold text-foreground">{key}.</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          {questions.length > 5 && (
            <div className="p-4 rounded-md bg-muted border border-dashed border-border text-center font-mono text-xs font-bold text-foreground">
              + Còn {questions.length - 5} câu hỏi nữa trong lượt làm bài đầy đủ.
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="space-y-6 pt-6 border-t-2 border-border">
        <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Đánh giá &amp; nhận xét ({reviews.length})
        </h2>

        {isAuthenticated && hasPermission('interaction:write') ? (
          <Card variant="flat" className="p-5 space-y-4">
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <h3 className="text-sm font-extrabold text-foreground">Gửi nhận xét của bạn cho đề thi này</h3>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-ink-muted">Đánh giá số sao:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStars(s)}
                      aria-label={`Chọn ${s} sao`}
                      className={`p-1.5 rounded-sm border transition-colors ${
                        s <= stars
                          ? 'bg-primary border-border text-foreground'
                          : 'bg-background border-border/30 text-ink-muted hover:border-border'
                      }`}
                    >
                      <Star className={`h-4 w-4 ${s <= stars ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ nhận xét về độ khó hoặc nội dung của đề thi..."
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border-[1.5px] border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          </Card>
        ) : (
          <div className="p-4 rounded-md bg-muted border border-border text-sm text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Đăng nhập tài khoản học viên để gửi nhận xét và chấm sao cho đề thi.</span>
            <Link to={`/login?redirect=${encodeURIComponent(`/quizzes/${id}`)}`}>
              <Button variant="outline" size="sm">
                Đăng nhập
              </Button>
            </Link>
          </div>
        )}

        {isReviewsLoading ? (
          <SkeletonLoader className="h-24 w-full rounded-md" />
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-sm text-ink-muted border border-dashed border-border rounded-md bg-surface">
            Chưa có đánh giá nào cho đề thi này.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.reviewId} variant="flat" className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-warning border border-border">
                      {r.stars}/5 ★
                    </span>
                    <span className="text-xs font-bold text-foreground">Học viên</span>
                  </div>
                  <span className="font-mono text-xs text-ink-muted">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{r.comment}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
