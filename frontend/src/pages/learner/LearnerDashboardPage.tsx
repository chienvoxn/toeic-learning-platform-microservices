import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { MembershipView } from '@/types/membership';
import { LearningActivity } from '@/types/interaction';
import { QuizView } from '@/types/quiz';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Progress } from '@/components/atoms/Progress';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { Alert } from '@/components/molecules/Alert';
import { EmptyState } from '@/components/molecules/EmptyState';
import { MetricCard } from '@/components/molecules/MetricCard';
import { PageHeroBanner } from '@/components/organisms/PageHeroBanner';
import {
  Award,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle2,
  Activity,
  TrendingUp,
  FileCheck,
  Calendar,
  Headphones,
  FileText,
  Play,
  RefreshCw,
} from 'lucide-react';

function formatActivityLabel(activityType: string): string {
  switch (activityType.toUpperCase()) {
    case 'ATTEMPT_GRADED':
      return 'Hoàn thành & chấm điểm bài thi';
    case 'ATTEMPT_SUBMITTED':
      return 'Đã nộp bài luyện tập';
    case 'ATTEMPT_STARTED':
      return 'Bắt đầu lượt luyện đề mới';
    case 'REVIEW_SUBMITTED':
    case 'CONTENT_REVIEWED':
      return 'Gửi đánh giá đề thi';
    default:
      return activityType.replace(/_/g, ' ');
  }
}

export function LearnerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch User's Attempts
  const {
    data: attempts = [],
    isLoading: isAttemptsLoading,
    isError: isAttemptsError,
    refetch: refetchAttempts,
  } = useQuery<AttemptView[]>({
    queryKey: ['learner-attempts'],
    queryFn: () => apiRequest<AttemptView[]>('/ms/v1/attempts'),
    staleTime: 1000 * 30,
  });

  // 2. Fetch User's Membership Plan & Daily Quota
  const {
    data: membership,
    isLoading: isMembershipLoading,
    isError: isMembershipError,
    refetch: refetchMembership,
  } = useQuery<MembershipView>({
    queryKey: ['learner-membership'],
    queryFn: () => apiRequest<MembershipView>('/api/v1/memberships/me'),
    staleTime: 1000 * 60 * 2,
  });

  // 3. Fetch User's Recent Activities
  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useQuery<LearningActivity[]>({
    queryKey: ['learner-activities'],
    queryFn: () => apiRequest<LearningActivity[]>('/api/v1/interactions/activities/me'),
    staleTime: 1000 * 30,
  });

  // 4. Fetch Quizzes Catalog to resolve Quiz Titles
  const { data: quizzes = [] } = useQuery<QuizView[]>({
    queryKey: ['public-quizzes'],
    queryFn: () => apiRequest<QuizView[]>('/ms/v1/contents/quizzes'),
    staleTime: 1000 * 60 * 10,
  });

  const quizMap = useMemo(() => {
    const map = new Map<string, QuizView>();
    quizzes.forEach((q) => map.set(q.id, q));
    return map;
  }, [quizzes]);

  // Compute truthful learning metrics without fabricating defaults on loading/error
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayAttempts = attempts.filter((a) => a.createdAt.slice(0, 10) === today);

    const gradedAttempts = attempts.filter((a) => a.status === 'GRADED');
    const inProgressAttempts = attempts.filter((a) => a.status === 'IN_PROGRESS');
    const totalGraded = gradedAttempts.length;

    let totalCorrect = 0;
    let totalQuestions = 0;
    gradedAttempts.forEach((a) => {
      totalCorrect += a.correct || 0;
      totalQuestions += a.total || 0;
    });

    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;
    const dailyQuotaLimit = membership
      ? (membership.maxPracticePerDay ?? (membership.planCode === 'PRO' ? 1000 : 10))
      : null;
    const dailyQuotaUsed = todayAttempts.length;

    return {
      dailyQuotaUsed,
      dailyQuotaLimit,
      totalGraded,
      totalCorrect,
      totalQuestions,
      overallAccuracy,
      inProgressCount: inProgressAttempts.length,
      latestInProgress: inProgressAttempts[0] ?? null,
    };
  }, [attempts, membership]);

  const recentAttempts = attempts.slice(0, 4);
  const quotaPercentage =
    metrics.dailyQuotaLimit && metrics.dailyQuotaLimit > 0
      ? Math.min((metrics.dailyQuotaUsed / metrics.dailyQuotaLimit) * 100, 100)
      : 0;

  const heroDescription = useMemo(() => {
    if (isAttemptsLoading || isMembershipLoading) {
      return 'Đang đồng bộ hạn ngạch luyện đề trong ngày và lịch sử làm bài của bạn...';
    }
    if (isAttemptsError || isMembershipError || metrics.dailyQuotaLimit === null) {
      return 'Theo dõi tiến độ luyện thi TOEIC, xem lại đáp án chi tiết và quản lý lịch sử làm bài của bạn.';
    }
    const baseText = `Hôm nay bạn đã sử dụng ${metrics.dailyQuotaUsed}/${metrics.dailyQuotaLimit} lượt luyện đề (làm mới lúc 00:00 UTC).`;
    if (metrics.inProgressCount > 0) {
      return `${baseText} Bạn đang có ${metrics.inProgressCount} bài làm dở có thể tiếp tục ngay.`;
    }
    return baseText;
  }, [isAttemptsLoading, isMembershipLoading, isAttemptsError, isMembershipError, metrics]);

  return (
    <div className="space-y-8">
      {/* 1. Learning Command Center Hero Banner */}
      <PageHeroBanner
        badgeText="Không gian học viên"
        title={`Xin chào, ${user?.displayName || 'Học viên'}`}
        description={heroDescription}
        actions={
          metrics.latestInProgress && !isAttemptsLoading && !isAttemptsError ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <Link to={`/exam/${metrics.latestInProgress.id}`}>
                <Button variant="primary" size="lg" className="gap-2">
                  <Play className="h-4 w-4 fill-current" /> Tiếp tục bài đang làm
                </Button>
              </Link>
              <Link to="/learner/quizzes">
                <Button variant="outline" size="lg" className="gap-2">
                  <BookOpen className="h-4 w-4" /> Kho đề thi
                </Button>
              </Link>
            </div>
          ) : (
            <Link to="/learner/quizzes" className="shrink-0">
              <Button variant="primary" size="lg" className="gap-2">
                <BookOpen className="h-4 w-4" /> Vào luyện đề ngay
              </Button>
            </Link>
          )
        }
      />

      {/* API Error Notice */}
      {(isAttemptsError || isMembershipError) && (
        <Alert type="error" title="Không thể tải đầy đủ dữ liệu học tập">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Một số chỉ số thống kê hoặc thông tin gói hiện chưa thể đồng bộ. Vui lòng thử lại.</span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => {
                refetchAttempts();
                refetchMembership();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* 2. Key Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Daily Practice Quota */}
        <MetricCard
          title="Lượt thi hôm nay"
          icon={Clock}
          colorScheme="blue"
          isLoading={isMembershipLoading || isAttemptsLoading}
          value={
            isMembershipError || isAttemptsError || metrics.dailyQuotaLimit === null ? (
              '—'
            ) : (
              <>
                {metrics.dailyQuotaUsed}{' '}
                <span className="font-sans text-sm font-semibold text-ink-muted">/ {metrics.dailyQuotaLimit}</span>
              </>
            )
          }
        >
          <div className="space-y-2 pt-1">
            {!isMembershipError && !isAttemptsError && metrics.dailyQuotaLimit !== null && (
              <Progress value={quotaPercentage} className="h-2.5" aria-label="Tiến độ hạn ngạch lượt thi hôm nay" />
            )}
            <p className="text-[11px] font-medium text-ink-muted">Làm mới lúc 00:00 UTC</p>
          </div>
        </MetricCard>

        {/* Membership Plan */}
        <MetricCard
          title="Gói hội viên"
          icon={Award}
          colorScheme="amber"
          isLoading={isMembershipLoading}
          value={
            isMembershipError || !membership ? (
              '—'
            ) : (
              <div className="flex items-center gap-2">
                <span>{membership.planCode}</span>
                <Badge variant={membership.planCode === 'PRO' ? 'pro' : 'secondary'} className="text-[10px]">
                  {membership.planCode === 'PRO' ? 'Mở rộng' : 'Cơ bản'}
                </Badge>
              </div>
            )
          }
        >
          <div className="pt-1">
            <Link
              to="/learner/membership"
              className="text-xs font-bold text-foreground underline decoration-2 underline-offset-4 hover:text-ink-muted inline-flex items-center gap-1"
            >
              Quản lý gói <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </MetricCard>

        {/* Graded Attempts Count */}
        <MetricCard
          title="Đề đã chấm điểm"
          icon={FileCheck}
          colorScheme="emerald"
          isLoading={isAttemptsLoading}
          value={
            isAttemptsError ? (
              '—'
            ) : (
              <>
                {metrics.totalGraded}{' '}
                <span className="font-sans text-sm font-semibold text-ink-muted">bài</span>
              </>
            )
          }
          subtitle={
            isAttemptsError
              ? 'Không thể tải dữ liệu'
              : metrics.inProgressCount > 0
              ? `${metrics.inProgressCount} bài đang làm dở`
              : 'Không có bài đang làm dở'
          }
        />

        {/* Overall Accuracy (Total correct / Total graded questions) */}
        <MetricCard
          title="Tỷ lệ đúng tổng thể"
          icon={TrendingUp}
          colorScheme="indigo"
          isLoading={isAttemptsLoading}
          value={
            isAttemptsError || metrics.overallAccuracy === null
              ? '—'
              : `${metrics.overallAccuracy}%`
          }
          subtitle={
            isAttemptsError
              ? 'Không thể tải dữ liệu'
              : metrics.overallAccuracy !== null
              ? `Tổng ${metrics.totalCorrect}/${metrics.totalQuestions} câu đúng`
              : 'Chưa có bài đã chấm'
          }
        />
      </div>

      {/* 3. Main 12-Column Editorial Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Active Attempt Banner + Recent History + Quick Catalog Links */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active In-Progress Callout */}
          {!isAttemptsLoading && !isAttemptsError && metrics.latestInProgress && (
            <Card variant="default" className="p-5 bg-warning/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Đang làm dở</Badge>
                  <span className="font-mono text-xs text-ink-muted">
                    {new Date(metrics.latestInProgress.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-foreground truncate">
                  {quizMap.get(metrics.latestInProgress.quizId)?.title ||
                    `Đề thi #${metrics.latestInProgress.quizId.slice(0, 8)}`}
                </h2>
                <p className="text-xs text-ink-muted">
                  Bạn có thể quay lại phòng thi để tiếp tục chọn đáp án và nộp bài.
                </p>
              </div>
              <Link to={`/exam/${metrics.latestInProgress.id}`} className="shrink-0">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Play className="h-3.5 w-3.5 fill-current" /> Làm tiếp bài này
                </Button>
              </Link>
            </Card>
          )}

          {/* Recent Practice History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Lịch sử luyện tập gần đây
              </h2>
              <Link
                to="/learner/history"
                className="text-xs font-bold text-foreground hover:underline decoration-2 underline-offset-4 flex items-center gap-1"
              >
                Xem toàn bộ ({attempts.length}) <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isAttemptsLoading ? (
              <div className="space-y-3">
                <SkeletonLoader className="h-24 w-full" />
                <SkeletonLoader className="h-24 w-full" />
                <SkeletonLoader className="h-24 w-full" />
              </div>
            ) : isAttemptsError ? (
              <Alert type="error" title="Không tải được danh sách bài làm">
                Vui lòng kiểm tra kết nối và nhấn thử lại.
              </Alert>
            ) : recentAttempts.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Bạn chưa thực hiện bài luyện tập nào"
                description="Chọn một đề thi Listening hoặc Reading từ kho đề để bắt đầu làm quen với định dạng bài thi."
                actionText="Khám phá kho đề thi"
                onAction={() => navigate('/learner/quizzes')}
              />
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((attempt) => {
                  const quiz = quizMap.get(attempt.quizId);
                  const isGraded = attempt.status === 'GRADED';
                  const percentage =
                    isGraded && attempt.total > 0
                      ? Math.round(((attempt.correct || 0) / attempt.total) * 100)
                      : 0;

                  return (
                    <Card
                      key={attempt.id}
                      variant="default"
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-brutal transition-shadow motion-reduce:transition-none"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={attempt.status} />
                          {quiz && (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              Part {quiz.part}
                            </Badge>
                          )}
                          <span className="font-mono text-xs text-ink-muted flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(attempt.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                          {quiz ? quiz.title : `Đề luyện thi #${attempt.quizId.slice(0, 8)}`}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/20">
                        {isGraded ? (
                          <div className="text-left sm:text-right">
                            <div className="font-mono text-lg font-black text-foreground">
                              {attempt.correct ?? 0}/{attempt.total}
                            </div>
                            <span className="font-mono text-xs font-bold text-ink-muted">
                              {percentage}% đúng
                            </span>
                          </div>
                        ) : (
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold text-foreground bg-warning/50 px-2 py-0.5 rounded-sm border border-border">
                              Chưa nộp bài
                            </span>
                          </div>
                        )}

                        <Link to={isGraded ? `/learner/results/${attempt.id}` : `/exam/${attempt.id}`}>
                          <Button variant={isGraded ? 'outline' : 'primary'} size="sm" className="gap-1.5">
                            {isGraded ? 'Xem kết quả' : 'Làm tiếp'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick Catalog Navigation Strip */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-lg font-extrabold text-foreground">Truy cập nhanh kho đề thi</h2>
              <Link
                to="/learner/quizzes"
                className="text-xs font-bold text-foreground hover:underline decoration-2 underline-offset-4 flex items-center gap-1"
              >
                Tất cả đề thi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to="/learner/quizzes?skill=listening" className="group">
                <Card variant="flat" className="p-4 h-full flex flex-col justify-between gap-3 group-hover:bg-secondary/25 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-sm border border-border bg-secondary text-foreground">
                      <Headphones className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-xs font-bold text-ink-muted">Part 1–4</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground group-hover:underline decoration-2 underline-offset-4">
                      Luyện Listening
                    </h3>
                    <p className="text-xs text-ink-muted mt-1">Hình ảnh, hỏi đáp, hội thoại &amp; bài nói.</p>
                  </div>
                </Card>
              </Link>

              <Link to="/learner/quizzes?skill=reading" className="group">
                <Card variant="flat" className="p-4 h-full flex flex-col justify-between gap-3 group-hover:bg-primary/25 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-sm border border-border bg-primary text-foreground">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-xs font-bold text-ink-muted">Part 5–7</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground group-hover:underline decoration-2 underline-offset-4">
                      Luyện Reading
                    </h3>
                    <p className="text-xs text-ink-muted mt-1">Hoàn thành câu, đoạn văn &amp; đọc hiểu.</p>
                  </div>
                </Card>
              </Link>

              <Link to="/learner/quizzes" className="group">
                <Card variant="muted" className="p-4 h-full flex flex-col justify-between gap-3 group-hover:bg-surface transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-sm border border-border bg-surface text-foreground">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground group-hover:underline decoration-2 underline-offset-4">
                      Toàn bộ kho đề
                    </h3>
                    <p className="text-xs text-ink-muted mt-1">Lọc đề FREE/PRO và tìm theo tiêu đề.</p>
                  </div>
                </Card>
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Recent Learning Activity Log */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5" /> Hoạt động học tập
            </h2>
          </div>

          <Card variant="default" className="p-5">
            {isActivitiesLoading ? (
              <div className="space-y-3">
                <SkeletonLoader className="h-14 w-full" />
                <SkeletonLoader className="h-14 w-full" />
                <SkeletonLoader className="h-14 w-full" />
              </div>
            ) : isActivitiesError ? (
              <div className="space-y-3 text-xs text-ink-muted">
                <p>Không thể tải nhật ký hoạt động lúc này.</p>
                <Button variant="outline" size="sm" onClick={() => refetchActivities()} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                </Button>
              </div>
            ) : activities.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm font-bold text-foreground">Chưa có hoạt động gần đây</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Các mốc hoàn thành bài thi và đánh giá đề sẽ được ghi nhận tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {activities.slice(0, 6).map((act) => (
                  <div key={act.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-extrabold text-foreground leading-snug">
                        {formatActivityLabel(act.activityType)}
                      </p>
                    </div>
                    {act.details && (
                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">{act.details}</p>
                    )}
                    <span className="font-mono text-[11px] text-ink-muted block pt-0.5">
                      {new Date(act.recordedAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {new Date(act.recordedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
