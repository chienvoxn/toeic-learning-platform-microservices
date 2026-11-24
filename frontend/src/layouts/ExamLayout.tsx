import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogOut } from 'lucide-react';

export function ExamLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] select-none">
      {/* Exam Header */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Phòng Thi Chuẩn TOEIC</h2>
            <p className="text-xs text-slate-500">Môi trường thi trực tuyến tập trung</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/learner/dashboard" onClick={(e) => {
            if (!window.confirm('Bạn có chắc chắn muốn rời khỏi phòng thi? Bài thi của bạn vẫn được lưu trạng thái trên máy chủ.')) {
              e.preventDefault();
            }
          }}>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-rose-600">
              <LogOut className="h-4 w-4 mr-1.5" /> Thoát phòng thi
            </Button>
          </Link>
        </div>
      </header>

      {/* Exam Canvas */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
