import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookPlus,
  ListChecks,
  LogOut,
  GraduationCap,
  LayoutDashboard,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TeacherLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Bàn làm việc', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Quản lý đề thi', path: '/teacher/quizzes', icon: ListChecks },
    { label: 'Tạo đề thi mới', path: '/teacher/quizzes/new', icon: BookPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <Link to="/teacher/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 block leading-tight">Giảng Viên TOEIC</span>
              <span className="text-[10px] text-slate-500 font-medium">Content Studio</span>
            </div>
          </Link>
        </div>

        {/* User Brief Info */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
              {user?.displayName || user?.email}
            </span>
            <Badge variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50 border-blue-200">
              TEACHER
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500 block truncate">{user?.email}</span>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/teacher/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-4 w-4', active ? 'text-blue-600' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="h-4 w-4 text-blue-600" />}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/learner/dashboard"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-slate-400" />
                <span>Khu vực Học viên</span>
              </div>
            </Link>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
