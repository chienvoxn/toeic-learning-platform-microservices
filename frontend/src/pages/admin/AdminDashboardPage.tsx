import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Bảng Điều Khiển Quản Trị Hệ Thống</h2>
        <p className="text-sm text-slate-500">Quản lý phân quyền RBAC và kiểm duyệt nội dung đề thi toàn sàn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/users">
          <Card className="hover:border-primary/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Quản lý Người dùng & RBAC</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Tra cứu danh bạ, gán quyền LEARNER, TEACHER, ADMIN.</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/quizzes">
          <Card className="hover:border-primary/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Kiểm duyệt Nội dung Đề thi</CardTitle>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Bật/tắt hiển thị đề thi trên danh mục công khai.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
