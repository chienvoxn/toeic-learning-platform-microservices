import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { UserDirectoryPage, AdminQuizzes } from '@/types/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  ShieldCheck,
  ArrowRight,
  Layers,
  FileCheck,
  FileEdit
} from 'lucide-react';

export function AdminDashboardPage() {
  // 1. Fetch Users Count
  const { data: usersData, isLoading: isUsersLoading } = useQuery<UserDirectoryPage>({
    queryKey: ['admin-users-overview'],
    queryFn: () => apiRequest<UserDirectoryPage>('/ms/v1/identity/admin/users?page=0'),
    staleTime: 1000 * 60,
  });

  // 2. Fetch Global Quizzes
  const { data: quizzesData, isLoading: isQuizzesLoading } = useQuery<AdminQuizzes>({
    queryKey: ['admin-quizzes-overview'],
    queryFn: () => apiRequest<AdminQuizzes>('/ms/v1/contents/quizzes/admin?page=0'),
    staleTime: 1000 * 60,
  });

  const quizStats = useMemo(() => {
    const list = quizzesData?.quizzes || [];
    const published = list.filter((q) => q.status === 'PUBLISHED').length;
    const drafts = list.filter((q) => q.status === 'DRAFT').length;
    return { published, drafts };
  }, [quizzesData]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 text-[11px]">
              Trung Tâm Quản Trị Hệ Thống
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Quản Trị Người Dùng & Kiểm Duyệt Đề Thi
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Phân quyền vai trò người dùng (LEARNER, TEACHER, ADMIN) và kiểm duyệt hiển thị đề thi trên toàn nền tảng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/users">
            <Button variant="primary" className="font-bold shadow-sm">
              <Users className="h-4 w-4 mr-2" /> Quản lý người dùng
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng số tài khoản</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {isUsersLoading ? '...' : usersData?.total ?? 0}
          </div>
          <p className="text-xs text-slate-500">Người dùng đã đăng ký</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng số đề thi toàn hệ thống</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {isQuizzesLoading ? '...' : quizzesData?.total ?? 0}
          </div>
          <p className="text-xs text-slate-500">Bao gồm cả bản nháp và đã duyệt</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Đề đã xuất bản (Trang đầu)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {isQuizzesLoading ? '...' : quizStats.published}
          </div>
          <p className="text-xs text-slate-500">Học viên có thể nhìn thấy</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Bản nháp (Trang đầu)</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <FileEdit className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {isQuizzesLoading ? '...' : quizStats.drafts}
          </div>
          <p className="text-xs text-slate-500">Chưa được công khai</p>
        </Card>
      </div>

      {/* Two Column Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User RBAC Management Card */}
        <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Danh Bạ Người Dùng & Cấp Quyền</h3>
                <p className="text-xs text-slate-500">Tra cứu người dùng theo email và gán vai trò</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hệ thống quản lý phân quyền đa vai trò (Multi-role RBAC). Quản trị viên có thể cấp vai trò <strong>TEACHER</strong> hoặc <strong>ADMIN</strong> cho bất kỳ tài khoản học viên nào.
          </p>

          <div className="pt-2">
            <Link to="/admin/users">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs text-blue-600 hover:bg-blue-50">
                <span>Vào trang Quản lý Người dùng & RBAC</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Quiz Moderation Card */}
        <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Kiểm Duyệt & Ẩn/Hiện Đề Thi</h3>
                <p className="text-xs text-slate-500">Duyệt đề thi của tất cả giảng viên</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Cho phép xem chi tiết từng đề thi của các giảng viên khác nhau, ẩn các đề thi không đạt chuẩn hoặc xuất bản trực tiếp các đề thi đủ điều kiện.
          </p>

          <div className="pt-2">
            <Link to="/admin/quizzes">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs text-emerald-600 hover:bg-emerald-50">
                <span>Vào trang Kiểm duyệt Đề thi Toàn hệ thống</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
