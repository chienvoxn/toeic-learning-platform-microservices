import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

export function LearnerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Xin chào, {user?.displayName || 'Học viên'}!</h2>
          <p className="text-sm text-slate-500">Tiếp tục lộ trình nâng điểm TOEIC hôm nay.</p>
        </div>
        <Link to="/quizzes">
          <Button variant="primary">
            Luyện đề ngay <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Hạn ngạch hôm nay</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0 / 10 lượt</div>
            <p className="text-xs text-slate-500 mt-1">Gói FREE làm mới sau 00:00 UTC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Hạng Hội Viên</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">FREE</span>
              <Badge variant="secondary">Cơ bản</Badge>
            </div>
            <Link to="/learner/membership" className="text-xs text-primary font-medium hover:underline mt-1 block">
              Nâng cấp trải nghiệm &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Bài thi đã hoàn thành</CardTitle>
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0 bài</div>
            <p className="text-xs text-slate-500 mt-1">Lịch sử được lưu trữ tự động</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
