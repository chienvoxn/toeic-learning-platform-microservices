import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { MembershipView } from '@/types/membership';
import { LearningActivity } from '@/types/interaction';
import { QuizView } from '@/types/quiz';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
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
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-card">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white">
              Học Viên TOEIC
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.displayName || 'Học viên'}!
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Hôm nay là một ngày tuyệt vời để nâng điểm số. Bạn đã hoàn thành {metrics.dailyQuotaUsed}/{metrics.dailyQuotaLimit} lượt luyện đề trong ngày.
          </p>
        </div>

        <Link to="/learner/quizzes" className="shrink-0">
          <Button size="lg" className="bg-white text-primary hover:bg-blue-50 font-bold px-6 shadow-sm">
            <BookOpen className="h-4 w-4 mr-2" /> Vào luyện đề ngay
          </Button>
        </Link>
      </div>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Quota Metric */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lượt thi hôm nay
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isMembershipLoading || isAttemptsLoading ? (
              <SkeletonLoader className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900">
                  {metrics.dailyQuotaUsed} <span className="text-sm font-normal text-slate-400">/ {metrics.dailyQuotaLimit}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((metrics.dailyQuotaUsed / metrics.dailyQuotaLimit) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">Làm mới lúc 00:00 UTC</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Membership Tier */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gói Hội Viên
            </CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isMembershipLoading ? (
              <SkeletonLoader className="h-8 w-20" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {membership?.planCode === 'PRO' ? 'PRO' : 'FREE'}
                  </span>
                  <Badge variant={membership?.planCode === 'PRO' ? 'pro' : 'secondary'} className="text-[10px]">
                    {membership?.planCode === 'PRO' ? 'Cao cấp' : 'Cơ bản'}
                  </Badge>
                </div>
                <Link to="/learner/membership" className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 pt-1">
                  Quản lý gói &rarr;
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Completed Exams */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đề Đã Chấm Điểm
            </CardTitle>
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isAttemptsLoading ? (
              <SkeletonLoader className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900">
                  {metrics.totalGraded} <span className="text-xs font-normal text-slate-400">bài thi</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {metrics.inProgressCount > 0 ? `${metrics.inProgressCount} bài đang làm dở` : 'Không có bài dang dở'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Average Accuracy */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Độ Chính Xác Trung Bình
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isAttemptsLoading ? (
              <SkeletonLoader className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900">
                  {metrics.averageAccuracy}%
                </div>
                <p className="text-[11px] text-slate-400">Tính trên toàn bộ bài thi đã nộp</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Attempts & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Attempts (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" /> Bài Thi Gần Đây
            </h3>
            <Link to="/learner/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Xem tất cả ({attempts.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isAttemptsLoading ? (
            <div className="space-y-3">
              <SkeletonLoader className="h-20 w-full rounded-xl" />
              <SkeletonLoader className="h-20 w-full rounded-xl" />
            </div>
          ) : recentAttempts.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300 bg-white">
              <div className="max-w-xs mx-auto space-y-3">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Chưa có bài thi nào</h4>
                <p className="text-xs text-slate-500">
                  Hãy bắt đầu bài thi đầu tiên để ghi nhận điểm số và theo dõi tiến độ.
                </p>
                <Link to="/learner/quizzes">
                  <Button size="sm" variant="primary">Khám phá đề thi</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => {
                const quiz = quizMap.get(attempt.quizId);
                const isGraded = attempt.status === 'GRADED';

                return (
                  <Card key={attempt.id} className="p-4 sm:p-5 border-slate-200 hover:border-primary/40 transition-all bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={attempt.status} />
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(attempt.createdAt).toLocaleDateString('vi-VN')} {new Date(attempt.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {quiz ? quiz.title : 'Đề luyện thi TOEIC'}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {isGraded ? (
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900">
                              {attempt.correct} / {attempt.total}
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-600">
                              {Math.round(((attempt.correct || 0) / attempt.total) * 100)}% đúng
                            </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-semibold text-amber-600">Đang làm dở</span>
                            <p className="text-[10px] text-slate-400">{attempt.total} câu hỏi</p>
                          </div>
                        )}

                        <Link to={isGraded ? `/learner/results/${attempt.id}` : `/exam/${attempt.id}`}>
                          <Button variant={isGraded ? 'outline' : 'primary'} size="sm" className="text-xs font-semibold">
                            {isGraded ? 'Xem giải thích' : 'Làm tiếp'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Real Learning Activities (Streamed via RabbitMQ) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" /> Nhật Ký Hoạt Động
            </h3>
            <Badge variant="outline" className="text-[10px] text-slate-500">Live Events</Badge>
          </div>

          <Card className="p-5 border-slate-200 bg-white">
            {isActivitiesLoading ? (
              <div className="space-y-3">
                <SkeletonLoader className="h-10 w-full" />
                <SkeletonLoader className="h-10 w-full" />
                <SkeletonLoader className="h-10 w-full" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 space-y-2 text-slate-400">
                <Activity className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs">Chưa có nhật ký hoạt động nào.</p>
                <p className="text-[11px] text-slate-400">
                  Hoạt động sẽ tự động cập nhật khi bạn hoàn thành bài thi (qua RabbitMQ Event).
                </p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="relative flex items-start gap-3 pl-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 z-10">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {act.activityType === 'EXAM_COMPLETED' ? 'Hoàn thành bài thi' : act.activityType}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{act.details || 'Đã nộp bài và chấm điểm tự động'}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(act.recordedAt).toLocaleDateString('vi-VN')} {new Date(act.recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
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
