import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { OwnedQuiz } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { MetricCard } from '@/components/molecules/MetricCard';
import { Alert } from '@/components/molecules/Alert';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PageHeroBanner } from '@/components/organisms/PageHeroBanner';
import {
  BookPlus,
  FileCheck,
  FileEdit,
  Layers,
  ArrowRight,
  BarChart2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export function TeacherDashboardPage() {
  const navigate = useNavigate();

  const {
    data: quizzes,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OwnedQuiz[]>({
    queryKey: ['teacher-quizzes'],
    queryFn: () => apiRequest<OwnedQuiz[]>('/ms/v1/contents/quizzes/mine'),
    staleTime: 1000 * 30,
  });

  const stats = useMemo(() => {
    if (isError || !quizzes) return null;
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.status === 'PUBLISHED').length;
    const drafts = quizzes.filter((q) => q.status === 'DRAFT').length;
    const totalQuestions = quizzes.reduce((sum, q) => sum + (q.count || 0), 0);

    return { total, published, drafts, totalQuestions };
  }, [quizzes, isError]);

  const recentQuizzes = useMemo(() => {
    if (!quizzes) return [];
    return quizzes.slice(0, 6);
  }, [quizzes]);

  return (
    <div className="space-y-8">
      {/* Header Banner (Periwinkle Workspace Identity) */}
      <PageHeroBanner
        badgeText="Không gian giảng viên"
        title="Trung tâm biên soạn & quản lý học liệu"
        description="Khởi tạo bản nháp, nhập câu hỏi hàng loạt từ CSV, đính kèm âm thanh hoặc hình ảnh và xem trước giao diện học viên trước khi xuất bản."
        className="border-l-secondary"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/teacher/quizzes">
              <Button variant="outline" size="md">
                Kho đề của tôi
              </Button>
            </Link>
            <Link to="/teacher/quizzes/new">
              <Button variant="primary" size="md">
                <BookPlus className="h-4 w-4" /> Tạo đề thi mới
              </Button>
            </Link>
          </div>
        }
      />

      {isError && (
        <Alert type="error" title="Không thể tải dữ liệu kho đề thi">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              {error instanceof Error
                ? error.message
                : 'Kết nối máy chủ nội dung thất bại. Dữ liệu thống kê chưa khả dụng.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* Metrics Row (Truthful metrics — never show fake 0 when loading or error) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Tổng số đề quản lý"
          value={stats ? stats.total : '—'}
          subtitle="Đề thi trong kho biên soạn cá nhân"
          icon={Layers}
          colorScheme="indigo"
          isLoading={isLoading}
        />
        <MetricCard
          title="Đề đã xuất bản"
          value={stats ? stats.published : '—'}
          subtitle="Đang hiển thị công khai cho học viên"
          icon={FileCheck}
          colorScheme="emerald"
          isLoading={isLoading}
        />
        <MetricCard
          title="Bản nháp đang soạn"
          value={stats ? stats.drafts : '—'}
          subtitle="Chưa xuất bản, có thể chỉnh sửa tiếp"
          icon={FileEdit}
          colorScheme="amber"
          isLoading={isLoading}
        />
        <MetricCard
          title="Tổng số câu hỏi"
          value={stats ? stats.totalQuestions : '—'}
          subtitle="Tích lũy từ toàn bộ đề đang quản lý"
          icon={BarChart2}
          colorScheme="blue"
          isLoading={isLoading}
        />
      </div>

      {/* Recent Quizzes Ledger */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[1.5px] border-border pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">
              Đề thi biên soạn gần đây
            </h2>
            <p className="text-xs text-ink-muted">
              Danh sách các bộ đề trong kho cá nhân, phân biệt rõ trạng thái bản nháp và đã xuất bản
            </p>
          </div>

          <Link to="/teacher/quizzes">
            <Button variant="outline" size="sm">
              <span>Xem toàn bộ kho đề</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonLoader className="h-20 w-full rounded-md" />
            <SkeletonLoader className="h-20 w-full rounded-md" />
            <SkeletonLoader className="h-20 w-full rounded-md" />
          </div>
        ) : isError ? (
          <Card variant="flat" className="p-6 text-center text-sm text-ink-muted">
            Không thể hiển thị danh sách đề thi do lỗi tải dữ liệu.
          </Card>
        ) : recentQuizzes.length === 0 ? (
          <EmptyState
            icon={BookPlus}
            title="Chưa có đề thi nào trong kho"
            description="Bắt đầu khởi tạo bản nháp đầu tiên để thêm câu hỏi thủ công hoặc nhập hàng loạt từ tệp CSV."
            actionText="Khởi tạo đề thi mới"
            onAction={() => navigate('/teacher/quizzes/new')}
          />
        ) : (
          <div className="space-y-3">
            {recentQuizzes.map((quiz) => {
              const isPublished = quiz.status === 'PUBLISHED';
              return (
                <Card
                  key={quiz.id}
                  variant="flat"
                  className="p-4 hover:shadow-brutal-sm transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={quiz.status} />
                      <Badge variant="outline" className="text-[11px]">
                        Part {quiz.part}
                      </Badge>
                      <Badge variant={quiz.premium ? 'pro' : 'outline'} className="text-[11px]">
                        {quiz.premium ? 'PRO' : 'FREE'}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-ink-muted">
                        v{quiz.version}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-foreground truncate">{quiz.title}</h3>
                    <p className="text-xs text-ink-muted">
                      Số câu hỏi:{' '}
                      <span className="font-mono font-bold text-foreground">{quiz.count || 0} câu</span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                    {isPublished ? (
                      <>
                        <Link to={`/quizzes/${quiz.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3.5 w-3.5" /> Xem đề công khai
                          </Button>
                        </Link>
                        <span className="text-[11px] text-ink-muted">
                          Đề đã xuất bản không thể chỉnh sửa trực tiếp.
                        </span>
                      </>
                    ) : (
                      <Link to={`/teacher/quizzes/${quiz.id}/edit`}>
                        <Button variant="secondary" size="sm">
                          <FileEdit className="h-3.5 w-3.5" /> Tiếp tục biên soạn
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
