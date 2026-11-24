import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BookPlus, ListChecks, CheckCircle } from 'lucide-react';

export function TeacherDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bàn Làm Việc Giảng Viên</h2>
          <p className="text-sm text-slate-500">Quản lý và biên soạn kho đề thi TOEIC chuẩn format.</p>
        </div>
        <Link to="/teacher/quizzes/new">
          <Button variant="primary">
            <BookPlus className="h-4 w-4 mr-2" /> Tạo Đề Thi Mới
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Đề thi đã xuất bản</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0 đề</div>
            <p className="text-xs text-slate-500 mt-1">Đang hiển thị cho học viên</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Bản nháp đang soạn</CardTitle>
            <ListChecks className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0 bản nháp</div>
            <p className="text-xs text-slate-500 mt-1">Chưa công khai</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
