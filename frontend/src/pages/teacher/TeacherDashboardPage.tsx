import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { OwnedQuiz } from '@/types/quiz';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 text-[11px]">
              Studio Giảng Viên
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Quản Lý & Soạn Thảo Đề Thi
          </h1>
          <p className="text-sm text-blue-100 max-w-xl">
            Tạo mới, chỉnh sửa bản nháp, xuất bản đề thi chuẩn TOEIC và theo dõi số lượng câu hỏi thực tế.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/teacher/quizzes/new">
            <Button className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-sm">
              <BookPlus className="h-4 w-4 mr-2" /> Tạo đề thi mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng số đề</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-xs text-slate-500">Đề thi trong kho cá nhân</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Đã xuất bản</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.published}</div>
          <p className="text-xs text-slate-500">Đang hiển thị cho học viên</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Bản nháp (Drafts)</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <FileEdit className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.drafts}</div>
          <p className="text-xs text-slate-500">Đang biên tập & chưa xuất bản</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng số câu hỏi</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <BarChart2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">{stats.totalQuestions}</div>
          <p className="text-xs text-slate-500">Câu hỏi trắc nghiệm đã tạo</p>
        </Card>
      </div>

      {/* Recent Quizzes List */}
      <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Đề thi gần đây</h3>
            <p className="text-xs text-slate-500">Danh sách đề thi được quản lý bởi tài khoản giảng viên hiện tại</p>
          </div>
          <Link to="/teacher/quizzes">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs">
              Xem tất cả <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonLoader className="h-14 w-full rounded-lg" />
            <SkeletonLoader className="h-14 w-full rounded-lg" />
            <SkeletonLoader className="h-14 w-full rounded-lg" />
          </div>
        ) : recentQuizzes.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <BookPlus className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Chưa có đề thi nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy bấm vào "Tạo đề thi mới" để bắt đầu soạn đề hoặc nhập câu hỏi nhanh bằng tệp CSV.
            </p>
            <Link to="/teacher/quizzes/new">
              <Button variant="primary" size="sm" className="mt-2">
                Bắt đầu tạo đề ngay
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentQuizzes.map((quiz) => {
              const isDraft = quiz.status === 'DRAFT';
              return (
                <div
                  key={quiz.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 px-3 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{quiz.title}</span>
                      <Badge variant={isDraft ? 'secondary' : 'default'} className="text-[10px]">
                        {isDraft ? 'Bản nháp (Draft)' : 'Đã xuất bản'}
                      </Badge>
                      {quiz.premium && (
                        <Badge variant="pro" className="text-[10px]">
                          PRO
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Part {quiz.part}</span>
                      <span>•</span>
                      <span>{quiz.count} câu hỏi</span>
                      <span>•</span>
                      <span className="font-mono text-[11px]">v{quiz.version}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDraft ? (
                      <Link to={`/teacher/quizzes/${quiz.id}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                          <FileEdit className="h-3.5 w-3.5 mr-1.5" /> Biên tập & Xuất bản
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/quizzes/${quiz.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-slate-600">
                          Xem trang công khai
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
