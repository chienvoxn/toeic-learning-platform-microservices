import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { BookPlus, ListChecks, LogOut, GraduationCap, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TeacherLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Bàn làm việc', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Đề thi của tôi', path: '/teacher/quizzes', icon: ListChecks },
    { label: 'Tạo đề thi mới', path: '/teacher/quizzes/new', icon: BookPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-base text-slate-900">Giảng Viên TOEIC</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-indigo-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="px-3 py-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Quyền: content:write</span>
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-rose-600 hover:bg-rose-50" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Khu vực Giảng viên</h1>
          <Link to="/preview">
            <Button variant="outline" size="sm">Design System</Button>
          </Link>
        </header>
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
