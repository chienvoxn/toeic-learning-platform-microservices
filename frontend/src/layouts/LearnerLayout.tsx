import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { MembershipView } from '@/types/membership';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  Award, 
  User, 
  LogOut, 
  GraduationCap, 
  Menu, 
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function LearnerLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch live membership plan for quick badge in topbar
  const { data: membership } = useQuery<MembershipView>({
    queryKey: ['learner-membership-chip'],
    queryFn: () => apiRequest<MembershipView>('/api/v1/memberships/me'),
    staleTime: 1000 * 60 * 5,
  });

  const navItems = [
    { label: 'Tổng quan', path: '/learner/dashboard', icon: LayoutDashboard },
    { label: 'Kho đề thi', path: '/learner/quizzes', icon: BookOpen },
    { label: 'Lịch sử thi', path: '/learner/history', icon: History },
    { label: 'Gói hội viên', path: '/learner/membership', icon: Award },
    { label: 'Tài khoản cá nhân', path: '/learner/profile', icon: User },
  ];

  const getPageTitle = () => {
    if (location.pathname.startsWith('/learner/results')) return 'Kết Quả Bài Thi & Lời Giải';
    if (location.pathname === '/learner/quizzes') return 'Thư Viện Đề Thi';
    if (location.pathname === '/learner/history') return 'Lịch Sử Luyện Đề';
    if (location.pathname === '/learner/membership') return 'Quản Lý Gói Hội Viên';
    if (location.pathname === '/learner/profile') return 'Thông Tin Tài Khoản';
    return 'Bàn Làm Việc Học Viên';
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col shrink-0 sticky top-0 h-screen">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-slate-900 leading-tight">TOEIC Master</span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Học Viên</span>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path === '/learner/quizzes' && location.pathname.startsWith('/quizzes'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-primary font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-slate-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout in Sidebar */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Gói hiện tại:</span>
              <Badge variant={membership?.planCode === 'PRO' ? 'pro' : 'secondary'} className="text-[10px] px-1.5 py-0">
                {membership?.planCode === 'PRO' ? 'PRO' : 'FREE'}
              </Badge>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-bold text-base text-slate-900">TOEIC Master</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-2 z-40">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium',
                location.pathname === item.path ? 'bg-blue-50 text-primary font-bold' : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 truncate">{user?.displayName}</span>
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>
              Đăng xuất
            </Button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 hidden sm:flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900">{getPageTitle()}</h1>
            <Badge variant="outline" className="text-[11px] font-normal text-slate-500">
              Không gian học viên
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {membership?.planCode === 'PRO' ? (
              <Badge variant="pro" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" /> Thành viên PRO
              </Badge>
            ) : (
              <Link to="/learner/membership">
                <Badge variant="secondary" className="hover:bg-slate-200 cursor-pointer text-xs">
                  Gói FREE (10 lượt/ngày)
                </Badge>
              </Link>
            )}

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
