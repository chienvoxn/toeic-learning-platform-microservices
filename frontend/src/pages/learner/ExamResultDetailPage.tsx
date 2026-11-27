import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { QuizView } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Progress } from '@/components/atoms/Progress';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { Alert } from '@/components/molecules/Alert';
import { FilterButtonGroup } from '@/components/molecules/FilterButtonGroup';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BookOpen,
  Calendar,
  HelpCircle,
  Headphones,
  FileText,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type QuestionFilter = 'ALL' | 'WRONG' | 'UNANSWERED' | 'CORRECT';

export function ExamResultDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('ALL');

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

  // 2. Fetch Quizzes to get the quiz title and part
  const { data: quizzes = [] } = useQuery<QuizView[]>({
    queryKey: ['public-quizzes'],
    queryFn: () => apiRequest<QuizView[]>('/ms/v1/contents/quizzes'),
    staleTime: 1000 * 60 * 10,
  });

  const quiz = quizzes.find((q) => q.id === attempt?.quizId);

  const summary = useMemo(() => {
    if (!attempt) {
      return {
        isGraded: false,
        totalQuestions: 0,
        questionsCount: 0,
        hasTotalMismatch: false,
        correctCount: 0,
        unansweredCount: 0,
        incorrectCount: 0,
        percentage: 0,
      };
    }
    const isGraded = attempt.status === 'GRADED';
    const questionsCount = attempt.questions.length;
    const totalQuestions = attempt.total || questionsCount;
    const hasTotalMismatch =
      attempt.total > 0 && questionsCount > 0 && attempt.total !== questionsCount;
    const unansweredCount = attempt.questions.filter((q) => !q.selectedChoice).length;
    const incorrectCount = isGraded
      ? attempt.questions.filter((q) => !!q.selectedChoice && q.correct === false).length
      : 0;
    const correctCount = isGraded
      ? attempt.correct ?? attempt.questions.filter((q) => !!q.selectedChoice && q.correct === true).length
      : 0;
    const percentage =
      isGraded && totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      isGraded,
      totalQuestions,
      questionsCount,
      hasTotalMismatch,
      correctCount,
      unansweredCount,
      incorrectCount,
      percentage,
    };
  }, [attempt]);

  const filteredQuestions = useMemo(() => {
    if (!attempt) return [];
    return attempt.questions.filter((q) => {
      if (questionFilter === 'ALL') return true;
      if (questionFilter === 'UNANSWERED') return !q.selectedChoice;
      if (questionFilter === 'CORRECT') return q.correct === true;
      if (questionFilter === 'WRONG') return !!q.selectedChoice && q.correct === false;
      return true;
    });
  }, [attempt, questionFilter]);

  if (isAttemptLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-6 w-40" />
        <SkeletonLoader className="h-48 w-full" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  if (isAttemptError || !attempt) {
    return (
      <div className="space-y-4 py-8 max-w-lg mx-auto">
        <Alert type="error" title="Không tìm thấy báo cáo bài thi">
          {(attemptError as Error)?.message || 'Lượt thi này không tồn tại hoặc bạn không có quyền truy cập.'}
        </Alert>
        <Link to="/learner/history">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại lịch sử luyện đề
          </Button>
        </Link>
      </div>
    );
  }

  const getEvaluationTag = (): {
    label: string;
    variant: 'success' | 'secondary' | 'warning' | 'destructive';
  } => {
    if (!summary.isGraded) return { label: 'Chưa chấm điểm', variant: 'warning' };
    if (summary.percentage >= 85) return { label: 'Xuất sắc', variant: 'success' };
    if (summary.percentage >= 70) return { label: 'Tốt', variant: 'secondary' };
    if (summary.percentage >= 50) return { label: 'Đạt yêu cầu', variant: 'warning' };
    return { label: 'Cần ôn luyện thêm', variant: 'destructive' };
  };

  const evaluation = getEvaluationTag();

  const filterOptions = [
    { value: 'ALL' as const, label: `Tất cả (${attempt.questions.length})` },
    ...(summary.isGraded
      ? [
          { value: 'WRONG' as const, label: `Trả lời sai (${summary.incorrectCount})` },
          { value: 'CORRECT' as const, label: `Trả lời đúng (${summary.correctCount})` },
        ]
      : []),
    { value: 'UNANSWERED' as const, label: `Bỏ trống (${summary.unansweredCount})` },
  ];

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/learner/history"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Trở về lịch sử luyện đề
        </Link>

        <Link to="/learner/quizzes">
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Luyện thêm đề khác
          </Button>
        </Link>
      </div>

      {/* Learning Report Summary Dossier */}
      <Card variant="elevated" className="p-0 overflow-hidden">
        <div className="bg-background border-b-2 border-border px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={attempt.status} />
            {quiz && (
              <Badge variant="outline" className="font-mono">
                Part {quiz.part}
              </Badge>
            )}
            <Badge variant={evaluation.variant}>{evaluation.label}</Badge>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(attempt.createdAt).toLocaleDateString('vi-VN')} ·{' '}
              {new Date(attempt.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span>#{attempt.id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-surface space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Báo cáo kết quả luyện tập
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {quiz?.title || 'Báo cáo bài luyện thi TOEIC'}
              </h1>
              {summary.isGraded && (
                <div className="pt-2 space-y-1.5 max-w-md">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-ink-muted">Tỷ lệ chính xác</span>
                    <span className="font-mono text-foreground">{summary.percentage}%</span>
                  </div>
                  <Progress value={summary.percentage} className="h-3" aria-label="Tỷ lệ câu trả lời đúng" />
                </div>
              )}
            </div>

            {/* Quantitative 4-Cell Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="p-3.5 rounded-md border-[1.5px] border-border bg-primary/40 text-center min-w-[100px]">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Tỷ lệ đúng
                </span>
                <span className="font-mono text-2xl font-black text-foreground">
                  {summary.isGraded ? `${summary.percentage}%` : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-md border-[1.5px] border-border bg-success/45 text-center min-w-[100px]">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Câu đúng
                </span>
                <span className="font-mono text-2xl font-black text-foreground">
                  {summary.isGraded ? summary.correctCount : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-md border-[1.5px] border-border bg-destructive/40 text-center min-w-[100px]">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Câu sai
                </span>
                <span className="font-mono text-2xl font-black text-foreground">
                  {summary.isGraded ? summary.incorrectCount : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-md border-[1.5px] border-border bg-muted text-center min-w-[100px]">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Bỏ trống
                </span>
                <span className="font-mono text-2xl font-black text-foreground">
                  {summary.unansweredCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Total vs Questions Count Mismatch Notice (if backend payload ever diverges) */}
      {summary.hasTotalMismatch && (
        <Alert type="info" title="Ghi nhận chênh lệch số lượng câu hỏi">
          Tổng số câu ghi nhận từ hệ thống là <strong className="font-mono">{attempt.total}</strong>, trong khi danh
          sách chi tiết trả về <strong className="font-mono">{summary.questionsCount}</strong> câu hỏi. Điểm tổng vẫn giữ
          nguyên theo kết quả hệ thống.
        </Alert>
      )}

      {/* Unsubmitted Attempt Alert */}
      {!summary.isGraded && (
        <Alert type="warning" title="Bài thi chưa được nộp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              Lượt thi này đang ở trạng thái làm dở. Đáp án đúng và giải thích chỉ hiển thị sau khi bạn nộp bài.
            </span>
            <Link to={`/exam/${attempt.id}`} className="shrink-0">
              <Button size="sm" variant="primary" className="gap-1.5">
                <Play className="h-3.5 w-3.5 fill-current" /> Tiếp tục làm bài
              </Button>
            </Link>
          </div>
        </Alert>
      )}

      {/* Question Analysis List */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-border pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Phân tích chi tiết từng câu ({attempt.questions.length})
            </h2>
            <p className="text-xs text-ink-muted">
              Đối chiếu lựa chọn của bạn với trạng thái chấm điểm và lời giải chi tiết.
            </p>
          </div>

          <FilterButtonGroup
            options={filterOptions}
            selectedValue={questionFilter}
            onChange={setQuestionFilter}
          />
        </div>

        {filteredQuestions.length === 0 ? (
          <Card variant="muted" className="p-8 text-center">
            <p className="text-sm font-bold text-foreground">Không có câu hỏi nào trong nhóm lọc này.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredQuestions.map((q) => {
              const isCorrect = summary.isGraded && q.correct === true;
              const isWrong = summary.isGraded && q.correct === false && !!q.selectedChoice;
              const isUnanswered = !q.selectedChoice;

              return (
                <Card key={q.id} variant="default" className="p-0 overflow-hidden">
                  {/* Question Status Header */}
                  <div
                    className={cn(
                      'px-5 py-3 border-b-[1.5px] border-border flex flex-wrap items-center justify-between gap-2',
                      isUnanswered
                        ? 'bg-muted'
                        : isCorrect
                        ? 'bg-success/45'
                        : isWrong
                        ? 'bg-destructive/40'
                        : 'bg-background'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-sm border border-border bg-surface text-foreground">
                        Câu {String(q.position).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-xs font-bold text-ink-muted">
                        Đã chọn: {q.selectedChoice || 'Chưa chọn'}
                      </span>
                    </div>

                    <div>
                      {isUnanswered ? (
                        <Badge variant="outline" className="gap-1 bg-surface">
                          <MinusCircle className="h-3.5 w-3.5" /> Chưa trả lời
                        </Badge>
                      ) : isCorrect ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Trả lời đúng
                        </Badge>
                      ) : isWrong ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Trả lời sai
                        </Badge>
                      ) : (
                        <Badge variant="warning">Chờ chấm</Badge>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt & Media */}
                  <div className="p-5 sm:p-6 space-y-4 bg-surface">
                    {q.audioUrl && (
                      <div className="p-3.5 bg-secondary/30 border border-border rounded-md space-y-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Headphones className="h-3.5 w-3.5" /> Nghe lại audio câu hỏi
                        </span>
                        <audio controls src={q.audioUrl} className="w-full h-9" />
                      </div>
                    )}

                    {q.imageUrl && (
                      <div className="rounded-md overflow-hidden border border-border max-h-72 flex justify-center bg-background p-3">
                        <img
                          src={q.imageUrl}
                          alt={`Hình minh họa câu ${q.position}`}
                          className="max-h-64 object-contain rounded-sm"
                        />
                      </div>
                    )}

                    {q.passageText && (
                      <div className="p-4 bg-background border border-border rounded-md text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2">
                          <FileText className="h-3.5 w-3.5" /> Đoạn văn đọc hiểu
                        </span>
                        {q.passageText}
                      </div>
                    )}

                    <p className="text-base font-bold text-foreground leading-relaxed">{q.prompt}</p>

                    {/* 4 Choices Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {Object.entries(q.choices).map(([choiceKey, choiceText]) => {
                        const isSelected = q.selectedChoice === choiceKey;

                        let choiceContainerStyle = 'border-border/40 bg-background text-foreground';
                        if (isSelected && summary.isGraded) {
                          choiceContainerStyle = isCorrect
                            ? 'border-2 border-border bg-success/45 text-foreground font-bold shadow-subtle'
                            : 'border-2 border-border bg-destructive/40 text-foreground font-bold shadow-subtle';
                        } else if (isSelected) {
                          choiceContainerStyle =
                            'border-2 border-border bg-primary/50 text-foreground font-bold shadow-subtle';
                        }

                        return (
                          <div
                            key={choiceKey}
                            className={cn(
                              'flex items-center justify-between gap-3 p-3 rounded-md border text-sm',
                              choiceContainerStyle
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono h-6 w-6 rounded-sm border border-border bg-surface font-bold text-xs flex items-center justify-center shrink-0">
                                {choiceKey}
                              </span>
                              <span className="leading-snug">{choiceText}</span>
                            </div>

                            {isSelected && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-sm border border-border bg-surface">
                                {summary.isGraded ? (
                                  isCorrect ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3" /> Bạn chọn · Đúng
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3" /> Bạn chọn · Sai
                                    </>
                                  )
                                ) : (
                                  'Bạn chọn'
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Official Explanation Callout */}
                  {summary.isGraded && q.explanation && (
                    <div className="border-t-[1.5px] border-border bg-muted px-5 py-4 sm:px-6 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground uppercase tracking-wider">
                        <HelpCircle className="h-4 w-4 shrink-0" /> Giải thích &amp; đáp án chi tiết
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
