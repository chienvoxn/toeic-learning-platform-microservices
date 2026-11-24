import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookPlus,
  ListChecks,
  LogOut,
  GraduationCap,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TeacherLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Bàn làm việc giảng viên', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Kho đề thi của tôi', path: '/teacher/quizzes', icon: ListChecks },
    { label: 'Biên soạn đề mới', path: '/teacher/quizzes/new', icon: BookPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 sticky top-0 h-auto md:h-screen">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <Link to="/teacher/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 block leading-tight">TOEIC Master</span>
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Khu Vực Giảng Viên</span>
            </div>
          </Link>
        </div>

        {/* User Brief Info */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
              {user?.displayName || user?.email}
            </span>
            <Badge variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50 border-blue-200">
              TEACHER
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500 block truncate">{user?.email}</span>
        </div>

        {/* Quick Switch Action to Learner Workspace */}
        <div className="px-4 pt-3 pb-1">
          <Link
            to="/learner/dashboard"
            className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 text-blue-800 text-xs font-semibold border border-blue-200/80 shadow-2xs transition-colors group"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600 group-hover:scale-105 transition-transform" />
              <span>Vào học / Luyện đề thi</span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200">
              Học viên →
            </span>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/teacher/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
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

          <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
            <Link
              to="/quizzes"
              className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                <span>Kho đề công khai</span>
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
            className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold"
          >
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Workspace Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900">Không Gian Giảng Viên</h1>
            <Badge variant="outline" className="text-[11px] font-normal text-blue-700 border-blue-200 bg-blue-50">
              Content Studio
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <WorkspaceSwitcher currentWorkspace="teacher" />

            <Link to="/quizzes">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                <span>Xem Website</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
