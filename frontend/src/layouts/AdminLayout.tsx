import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Người dùng & phân quyền', path: '/admin/users', icon: Users },
    { label: 'Kiểm duyệt đề thi', path: '/admin/quizzes', icon: ShieldCheck },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/admin/users') return 'Quản trị người dùng & phân quyền';
    if (location.pathname === '/admin/quizzes') return 'Kiểm duyệt kho đề thi';
    return 'Tổng quan quản trị hệ thống';
  };

  // User card
  const userCard = (
    <div className="p-4 bg-background/60">
      <div className="p-3 bg-surface rounded-md border border-border space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink-muted">Vai trò hiện tại:</span>
          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
            Quản trị viên
          </Badge>
        </div>
        <p className="text-sm font-bold text-foreground truncate">{user?.displayName || 'Quản trị viên'}</p>
        <p className="text-xs text-ink-muted truncate">{user?.email}</p>
      </div>
    </div>
  );

  // Quick switch back to Learner and Teacher workspaces (preserving exact role guard & test labels)
  const quickSwitchBanner = (
    <div className="px-4 pt-3 pb-1">
      <div className="p-2.5 rounded-md bg-background border border-border space-y-2">
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
          Chuyển nhanh không gian
        </span>
        <div className="flex flex-col gap-1.5">
          <Link
            to="/learner/dashboard"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-surface hover:bg-primary/25 text-foreground text-xs font-bold border border-border transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-foreground shrink-0" />
              <span>Khu vực Học viên</span>
            </span>
            <span className="text-[10px] font-semibold text-ink-muted">Chuyển →</span>
          </Link>

          {user?.roles?.includes('TEACHER') && (
            <Link
              to="/teacher/dashboard"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-surface hover:bg-secondary/40 text-foreground text-xs font-bold border border-border transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-foreground shrink-0" />
                <span>Khu vực Giảng viên</span>
              </span>
              <span className="text-[10px] font-semibold text-ink-muted">Chuyển →</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  const headerActions = (
    <Link to="/quizzes">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
        <span>Kho đề công khai</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </Link>
  );

  return (
    <DashboardLayout
      workspaceRole="admin"
      brandSubtitle="Trung tâm quản trị"
      headerTitle={getPageTitle()}
      headerBadge="Quản trị & kiểm duyệt"
      navItems={navItems}
      quickSwitchBanner={quickSwitchBanner}
      userCard={userCard}
      headerActions={headerActions}
      onLogout={logout}
    />
  );
}
