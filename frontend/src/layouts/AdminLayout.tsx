import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Người dùng & Phân quyền', path: '/admin/users', icon: Users },
    { label: 'Kiểm duyệt đề thi', path: '/admin/quizzes', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 sticky top-0 h-auto md:h-screen">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 block leading-tight">TOEIC Master</span>
              <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Quản Trị Hệ Thống</span>
            </div>
          </Link>
        </div>

        {/* User Brief Card */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
              {user?.displayName || user?.email}
            </span>
            <Badge variant="outline" className="text-[10px] font-bold text-rose-700 bg-rose-50 border-rose-200">
              ADMIN
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500 block truncate">{user?.email}</span>
        </div>

        {/* Quick Return to Learner Workspace */}
        <div className="px-4 pt-3 pb-1">
          <Link
            to="/learner/dashboard"
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-slate-600" />
              <span>Khu vực Học viên</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Chuyển →
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-rose-50 text-rose-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-4 w-4', active ? 'text-rose-600' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="h-4 w-4 text-rose-600" />}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
            {user?.roles?.includes('TEACHER') && (
              <Link
                to="/teacher/dashboard"
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  <span>Khu vực Giảng viên</span>
                </div>
              </Link>
            )}
            <Link
              to="/quizzes"
              className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                <span>Xem kho đề công khai</span>
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

      {/* Main Admin Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900">Quản Trị Hệ Thống</h1>
            <Badge variant="outline" className="text-[11px] font-normal text-rose-700 border-rose-200 bg-rose-50">
              RBAC & Moderation
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <WorkspaceSwitcher currentWorkspace="admin" />

            <Link to="/quizzes">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                <span>Xem Website</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
