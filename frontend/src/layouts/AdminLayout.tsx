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
    { label: 'Người dùng & Phân quyền', path: '/admin/users', icon: Users },
    { label: 'Kiểm duyệt đề thi', path: '/admin/quizzes', icon: ShieldCheck },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/admin/users') return 'Quản Trị Người Dùng & RBAC';
    if (location.pathname === '/admin/quizzes') return 'Kiểm Duyệt Kho Đề Thi';
    return 'Quản Trị Hệ Thống';
  };

  // User card
  const userCard = (
    <div className="px-5 py-3.5 bg-background/60">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground truncate max-w-[140px]">
          {user?.displayName || user?.email}
        </span>
        <Badge variant="destructive" className="font-mono text-[10px] uppercase">
          ADMIN
        </Badge>
      </div>
      <span className="text-xs text-ink-muted block truncate mt-0.5">{user?.email}</span>
    </div>
  );

  // Quick switch back to Learner and Teacher workspaces
  const quickSwitchBanner = (
    <div className="px-4 pt-3 pb-1 space-y-1.5">
      <Link
        to="/learner/dashboard"
        className="flex items-center justify-between p-2.5 rounded-md bg-background hover:bg-muted text-foreground text-xs font-bold border border-border transition-colors"
      >
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-foreground shrink-0" />
          <span>Khu vực Học viên</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-foreground bg-surface px-1.5 py-0.5 rounded-sm border border-border">
          Chuyển →
        </span>
      </Link>

      {user?.roles?.includes('TEACHER') && (
        <Link
          to="/teacher/dashboard"
          className="flex items-center justify-between p-2.5 rounded-md bg-background hover:bg-secondary/40 text-foreground text-xs font-bold border border-border transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-foreground shrink-0" />
            <span>Khu vực Giảng viên</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-foreground bg-surface px-1.5 py-0.5 rounded-sm border border-border">
            Chuyển →
          </span>
        </Link>
      )}
    </div>
  );

  const headerActions = (
    <Link to="/quizzes">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
        <span>Xem Website</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </Link>
  );

  return (
    <DashboardLayout
      workspaceRole="admin"
      brandSubtitle="Quản Trị Hệ Thống"
      headerTitle={getPageTitle()}
      headerBadge="RBAC & Moderation"
      navItems={navItems}
      quickSwitchBanner={quickSwitchBanner}
      userCard={userCard}
      headerActions={headerActions}
      onLogout={logout}
    />
  );
}
