import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { OwnedQuiz } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { MetricCard } from '@/components/molecules/MetricCard';
import { PageHeroBanner } from '@/components/organisms/PageHeroBanner';
import {
  BookPlus,
  FileCheck,
  FileEdit,
  Layers,
  ArrowRight,
  BarChart2
} from 'lucide-react';

export function TeacherDashboardPage() {
  const { data: quizzes = [], isLoading } = useQuery<OwnedQuiz[]>({
    queryKey: ['teacher-quizzes'],
    queryFn: () => apiRequest<OwnedQuiz[]>('/ms/v1/contents/quizzes/mine'),
    staleTime: 1000 * 30,
  });

  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.status === 'PUBLISHED').length;
    const drafts = quizzes.filter((q) => q.status === 'DRAFT').length;
    const totalQuestions = quizzes.reduce((sum, q) => sum + (q.count || 0), 0);

    return { total, published, drafts, totalQuestions };
  }, [quizzes]);

  const recentQuizzes = useMemo(() => {
    return quizzes.slice(0, 5);
  }, [quizzes]);

  return (
    <div className="space-y-8">
      {/* Header Banner (Organism) */}
      <PageHeroBanner
        badgeText="Studio Giảng Viên"
        title="Quản Lý & Soạn Thảo Đề Thi"
        description="Tạo mới, chỉnh sửa bản nháp, xuất bản đề thi chuẩn TOEIC và theo dõi số lượng câu hỏi thực tế."
        gradient="from-blue-700 via-blue-600 to-indigo-700"
        actions={
          <Link to="/teacher/quizzes/new">
            <Button className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-sm">
              <BookPlus className="h-4 w-4 mr-2" /> Tạo đề thi mới
            </Button>
          </Link>
        }
      />

      {/* Metrics Row (Molecules) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Tổng số đề"
          value={stats.total}
          subtitle="Đề thi trong kho cá nhân"
          icon={Layers}
          colorScheme="blue"
          isLoading={isLoading}
        />
        <MetricCard
          title="Đã xuất bản"
          value={stats.published}
          subtitle="Đang hiển thị cho học viên"
          icon={FileCheck}
          colorScheme="emerald"
          isLoading={isLoading}
        />
        <MetricCard
          title="Bản nháp (Drafts)"
          value={stats.drafts}
          subtitle="Đang biên tập & chưa xuất bản"
          icon={FileEdit}
          colorScheme="amber"
          isLoading={isLoading}
        />
        <MetricCard
          title="Tổng số câu hỏi"
          value={stats.totalQuestions}
          subtitle="Tích lũy từ tất cả các đề"
          icon={BarChart2}
          colorScheme="indigo"
          isLoading={isLoading}
        />
      </div>

      {/* Recent Quizzes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Đề thi biên soạn gần đây</h2>
            <p className="text-xs text-slate-500">Danh sách các bộ đề được cập nhật trong phiên làm việc mới nhất</p>
          </div>

          <Link to="/teacher/quizzes">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <span>Xem toàn bộ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonLoader className="h-16 w-full rounded-xl" />
            <SkeletonLoader className="h-16 w-full rounded-xl" />
            <SkeletonLoader className="h-16 w-full rounded-xl" />
          </div>
        ) : recentQuizzes.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-slate-300">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <BookPlus className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Chưa có đề thi nào trong kho</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Hãy bắt đầu khởi tạo bộ đề thi TOEIC đầu tiên bằng trình soạn thảo bản nháp hoặc tải lên bằng tệp CSV.
            </p>
            <Link to="/teacher/quizzes/new">
              <Button variant="primary" size="sm">Khởi tạo đề thi mới</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentQuizzes.map((quiz) => {
              const isPublished = quiz.status === 'PUBLISHED';
              return (
                <Card
                  key={quiz.id}
                  className="p-4 border-slate-200/90 hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPublished
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isPublished ? 'Đã xuất bản' : 'Bản nháp (Draft)'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        Part {quiz.part}
                      </span>
                      {quiz.premium && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          PRO
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate">{quiz.title}</h3>
                    <p className="text-xs text-slate-500">
                      Số câu hỏi: <span className="font-semibold text-slate-700">{quiz.count || 0}</span> câu
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/teacher/quizzes/${quiz.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                        Chỉnh sửa đề
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
