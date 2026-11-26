import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { MembershipView } from '@/types/membership';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { Badge } from '@/components/atoms/Badge';
import {
  LayoutDashboard,
  BookOpen,
  History,
  Award,
  User,
  BookOpenCheck,
  ShieldAlert,
} from 'lucide-react';

export function LearnerLayout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  // Fetch live membership plan for quick badge in sidebar user card
  const { data: membership } = useQuery<MembershipView>({
    queryKey: ['learner-membership-chip'],
    queryFn: () => apiRequest<MembershipView>('/api/v1/memberships/me'),
    staleTime: 1000 * 60 * 5,
  });

  const navItems = [
    { label: 'Tổng quan học tập', path: '/learner/dashboard', icon: LayoutDashboard },
    { label: 'Kho đề thi TOEIC', path: '/learner/quizzes', icon: BookOpen },
    { label: 'Lịch sử luyện đề', path: '/learner/history', icon: History },
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

  // Quick Multi-role Switch Banner if Teacher or Admin
  const quickSwitchBanner = (hasRole('TEACHER') || hasRole('ADMIN')) ? (
    <div className="px-4 pt-3 pb-1">
      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
          Chuyển nhanh không gian
        </span>
        <div className="flex flex-col gap-1">
          {hasRole('TEACHER') && (
            <Link
              to="/teacher/dashboard"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-100/50 text-blue-700 text-xs font-semibold border border-blue-200/60 shadow-2xs transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <BookOpenCheck className="h-3.5 w-3.5 text-blue-600" /> Giảng viên
              </span>
              <span className="text-[10px] text-blue-500">Sang soạn đề →</span>
            </Link>
          )}
          {hasRole('ADMIN') && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200/60 shadow-2xs transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> Quản trị
              </span>
              <span className="text-[10px] text-rose-500">Quản trị viên →</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : undefined;

  // Sidebar User Profile Card
  const userCard = (
    <div className="p-4 bg-slate-50/50">
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
    </div>
  );

  return (
    <DashboardLayout
      workspaceRole="learner"
      brandSubtitle="Học Viên"
      headerTitle={getPageTitle()}
      headerBadge={membership?.planCode === 'PRO' ? 'PRO Member' : 'Free Member'}
      navItems={navItems}
      quickSwitchBanner={quickSwitchBanner}
      userCard={userCard}
      onLogout={logout}
    />
  );
}
