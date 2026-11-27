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
    if (location.pathname.startsWith('/learner/results')) return 'Kết quả bài thi & lời giải';
    if (location.pathname === '/learner/quizzes') return 'Kho đề thi TOEIC';
    if (location.pathname === '/learner/history') return 'Lịch sử luyện đề';
    if (location.pathname === '/learner/membership') return 'Quản lý gói hội viên';
    if (location.pathname === '/learner/profile') return 'Tài khoản cá nhân';
    return 'Tổng quan học tập';
  };

  // Quick Multi-role Switch Banner if Teacher or Admin
  const quickSwitchBanner = (hasRole('TEACHER') || hasRole('ADMIN')) ? (
    <div className="px-4 pt-3 pb-1">
      <div className="p-2.5 rounded-md bg-background border border-border space-y-2">
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
          Chuyển nhanh không gian
        </span>
        <div className="flex flex-col gap-1.5">
          {hasRole('TEACHER') && (
            <Link
              to="/teacher/dashboard"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-surface hover:bg-secondary/40 text-foreground text-xs font-bold border border-border transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <BookOpenCheck className="h-3.5 w-3.5 text-foreground" /> Giảng viên
              </span>
              <span className="text-[10px] font-semibold text-ink-muted">Sang soạn đề →</span>
            </Link>
          )}
          {hasRole('ADMIN') && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-surface hover:bg-warning/50 text-foreground text-xs font-bold border border-border transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-foreground" /> Quản trị
              </span>
              <span className="text-[10px] font-semibold text-ink-muted">Quản trị viên →</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : undefined;

  // Sidebar User Profile Card
  const userCard = (
    <div className="p-4 bg-background/60">
      <div className="p-3 bg-surface rounded-md border border-border space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink-muted">Gói hiện tại:</span>
          {membership ? (
            <Badge variant={membership.planCode === 'PRO' ? 'pro' : 'outline'} className="text-[10px] px-1.5 py-0">
              {membership.planCode}
            </Badge>
          ) : (
            <span className="font-mono text-[10px] font-bold text-ink-muted">—</span>
          )}
        </div>
        <p className="text-sm font-bold text-foreground truncate">{user?.displayName}</p>
        <p className="text-xs text-ink-muted truncate">{user?.email}</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      workspaceRole="learner"
      brandSubtitle="Không gian học viên"
      headerTitle={getPageTitle()}
      headerBadge={membership ? (membership.planCode === 'PRO' ? 'Gói PRO' : 'Gói FREE') : undefined}
      navItems={navItems}
      quickSwitchBanner={quickSwitchBanner}
      userCard={userCard}
      onLogout={logout}
    />
  );
}
