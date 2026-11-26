import { useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { PageHeroBanner } from '@/components/organisms/PageHeroBanner';
import { MetricCard } from '@/components/molecules/MetricCard';
import { 
  Award, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Activity, 
  TrendingUp,
  FileCheck,
  Calendar
} from 'lucide-react';

export function LearnerDashboardPage() {
  const { user } = useAuth();

  // 1. Fetch User's Attempts
  const { data: attempts = [], isLoading: isAttemptsLoading } = useQuery<AttemptView[]>({
    queryKey: ['learner-attempts'],
    queryFn: () => apiRequest<AttemptView[]>('/ms/v1/attempts'),
    staleTime: 1000 * 30, // 30 seconds
  });

  // 2. Fetch User's Membership Plan & Daily Quota
  const { data: membership, isLoading: isMembershipLoading } = useQuery<MembershipView>({
    queryKey: ['learner-membership'],
    queryFn: () => apiRequest<MembershipView>('/api/v1/memberships/me'),
    staleTime: 1000 * 60 * 2,
  });

  // 3. Fetch User's Recent Activities (RabbitMQ Event Stream)
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery<LearningActivity[]>({
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

  // Compute real learning metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayAttempts = attempts.filter((a) => a.createdAt.slice(0, 10) === today);

    const gradedAttempts = attempts.filter((a) => a.status === 'GRADED');
    const totalGraded = gradedAttempts.length;

    let totalCorrect = 0;
    let totalQuestions = 0;
    gradedAttempts.forEach((a) => {
      totalCorrect += a.correct || 0;
      totalQuestions += a.total || 0;
    });

    const averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const dailyQuotaLimit = membership?.maxPracticePerDay || 10;
    const dailyQuotaUsed = todayAttempts.length;

    return {
      dailyQuotaUsed,
      dailyQuotaLimit,
      totalGraded,
      averageAccuracy,
      inProgressCount: attempts.length - totalGraded,
    };
  }, [attempts, membership]);

  const recentAttempts = attempts.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner (Organism) */}
      <PageHeroBanner
        badgeText="Học Viên TOEIC"
        title={`Xin chào, ${user?.displayName || 'Học viên'}!`}
        description={`Hôm nay là một ngày tuyệt vời để nâng điểm số. Bạn đã hoàn thành ${metrics.dailyQuotaUsed}/${metrics.dailyQuotaLimit} lượt luyện đề trong ngày.`}
        actions={
          <Link to="/learner/quizzes" className="shrink-0">
            <Button size="lg" className="bg-white text-primary hover:bg-blue-50 font-bold px-6 shadow-sm">
              <BookOpen className="h-4 w-4 mr-2" /> Vào luyện đề ngay
            </Button>
          </Link>
        }
      />

      {/* Real Statistics Grid (MetricCard Molecules) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Quota Metric */}
        <MetricCard
          title="Lượt thi hôm nay"
          icon={Clock}
          colorScheme="blue"
          isLoading={isMembershipLoading || isAttemptsLoading}
          value={
            <>
              {metrics.dailyQuotaUsed}{' '}
              <span className="text-sm font-normal text-slate-400">/ {metrics.dailyQuotaLimit}</span>
            </>
          }
        >
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min((metrics.dailyQuotaUsed / metrics.dailyQuotaLimit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Làm mới lúc 00:00 UTC</p>
          </div>
        </MetricCard>

        {/* Membership Tier */}
        <MetricCard
          title="Gói Hội Viên"
          icon={Award}
          colorScheme="amber"
          isLoading={isMembershipLoading}
          value={
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {membership?.planCode === 'PRO' ? 'PRO' : 'FREE'}
              </span>
              <Badge variant={membership?.planCode === 'PRO' ? 'pro' : 'secondary'} className="text-[10px]">
                {membership?.planCode === 'PRO' ? 'Cao cấp' : 'Cơ bản'}
              </Badge>
            </div>
          }
        >
          <div className="pt-1">
            <Link to="/learner/membership" className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1">
              Quản lý gói &rarr;
            </Link>
          </div>
        </MetricCard>

        {/* Total Completed Exams */}
        <MetricCard
          title="Đề Đã Chấm Điểm"
          icon={FileCheck}
          colorScheme="emerald"
          isLoading={isAttemptsLoading}
          value={
            <>
              {metrics.totalGraded}{' '}
              <span className="text-xs font-normal text-slate-400">bài thi</span>
            </>
          }
          subtitle={metrics.inProgressCount > 0 ? `${metrics.inProgressCount} bài đang làm dở` : 'Không có bài dang dở'}
        />

        {/* Average Accuracy */}
        <MetricCard
          title="Độ Chính Xác Trung Bình"
          icon={TrendingUp}
          colorScheme="indigo"
          isLoading={isAttemptsLoading}
          value={`${metrics.averageAccuracy}%`}
          subtitle={metrics.totalGraded > 0 ? 'Dựa trên tất cả các lần nộp' : 'Chưa có dữ liệu bài thi'}
        />
      </div>

      {/* Main Content Layout (Recent Attempts & Live Activity Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Attempts (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Bài thi vừa hoàn thành
            </h3>
            <Link to="/learner/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Xem toàn bộ ({attempts.length}) <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isAttemptsLoading ? (
            <div className="space-y-3">
              <SkeletonLoader className="h-20 w-full rounded-xl" />
              <SkeletonLoader className="h-20 w-full rounded-xl" />
            </div>
          ) : recentAttempts.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300">
              <p className="text-sm text-slate-500 mb-3">Bạn chưa tham gia bài thi nào.</p>
              <Link to="/learner/quizzes">
                <Button variant="primary" size="sm">Bắt đầu bài thi đầu tiên</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => {
                const quiz = quizMap.get(attempt.quizId);
                const isGraded = attempt.status === 'GRADED';
                const percentage = isGraded && attempt.total > 0
                  ? Math.round(((attempt.correct || 0) / attempt.total) * 100)
                  : 0;

                return (
                  <Card key={attempt.id} className="p-4 border-slate-200/90 hover:border-primary/40 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={attempt.status} />
                        {quiz && (
                          <Badge variant="outline" className="text-[10px]">
                            Part {quiz.part}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(attempt.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {quiz ? quiz.title : `Đề thi #${attempt.quizId.slice(0, 8)}`}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {isGraded ? (
                        <div className="text-right">
                          <div className="text-base font-black text-primary">
                            {attempt.correct}/{attempt.total}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {percentage}% chính xác
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-semibold text-amber-600">Đang dang dở</span>
                        </div>
                      )}

                      <Link to={isGraded ? `/learner/results/${attempt.id}` : `/exam/${attempt.id}`}>
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold">
                          {isGraded ? 'Xem giải' : 'Làm tiếp'}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interaction Service Activities Stream (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" /> Nhật ký học tập tức thì
            </h3>
          </div>

          <Card className="p-5 border-slate-200/90 bg-white">
            {isActivitiesLoading ? (
              <div className="space-y-3">
                <SkeletonLoader className="h-12 w-full rounded-lg" />
                <SkeletonLoader className="h-12 w-full rounded-lg" />
                <SkeletonLoader className="h-12 w-full rounded-lg" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Chưa có sự kiện hoạt động nào được ghi nhận từ RabbitMQ.
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="relative text-xs space-y-0.5">
                    <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary shadow-xs" />
                    <p className="font-bold text-slate-800 leading-snug">{act.activityType}</p>
                    {act.details && (
                      <p className="text-slate-500 line-clamp-2">{act.details}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(act.recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.recordedAt).toLocaleDateString('vi-VN')}
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
