import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, ShieldCheck, ShieldAlert, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Quản lý người dùng', path: '/admin/users', icon: Users },
    { label: 'Kiểm duyệt đề thi', path: '/admin/quizzes', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-64 border-r border-slate-200 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="font-bold text-base text-white">Quản Trị Viên</span>
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
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-rose-500' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="px-3 py-2 bg-slate-800/80 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Quyền: rbac:manage</span>
            <p className="text-sm font-semibold text-white truncate">{user?.displayName}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-rose-400 hover:bg-slate-800 hover:text-rose-300" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Khu vực Quản trị</h1>
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
