import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import {
  LayoutDashboard,
  ListChecks,
  BookPlus,
  BookOpen,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

export function TeacherLayout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Bàn làm việc giảng viên', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Kho đề thi của tôi', path: '/teacher/quizzes', icon: ListChecks },
    { label: 'Biên soạn đề mới', path: '/teacher/quizzes/new', icon: BookPlus },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/teacher/quizzes/new') return 'Biên soạn đề thi mới';
    if (location.pathname.includes('/edit')) return 'Chỉnh sửa bản nháp';
    if (location.pathname === '/teacher/quizzes') return 'Kho đề thi của tôi';
    return 'Bàn làm việc giảng viên';
  };

  // User summary block
  const userCard = (
    <div className="p-4 bg-background/60">
      <div className="p-3 bg-surface rounded-md border border-border space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink-muted">Vai trò hiện tại:</span>
          <Badge variant="secondary" className="bg-secondary text-foreground text-[10px] px-1.5 py-0">
            Giảng viên
          </Badge>
        </div>
        <p className="text-sm font-bold text-foreground truncate">{user?.displayName || 'Giảng viên'}</p>
        <p className="text-xs text-ink-muted truncate">{user?.email}</p>
      </div>
    </div>
  );

  // Quick switch to Learner and (when authorized) Admin workspaces
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
              <BookOpen className="h-3.5 w-3.5 text-foreground shrink-0" /> Học viên
            </span>
            <span className="text-[10px] font-semibold text-ink-muted">Sang luyện đề →</span>
          </Link>

          {hasRole('ADMIN') && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-surface hover:bg-warning/50 text-foreground text-xs font-bold border border-border transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-foreground shrink-0" /> Quản trị
              </span>
              <span className="text-[10px] font-semibold text-ink-muted">Quản trị viên →</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  // Header action: link to public catalog
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
      workspaceRole="teacher"
      brandSubtitle="Không gian giảng viên"
      headerTitle={getPageTitle()}
      headerBadge="Biên soạn đề"
      navItems={navItems}
      quickSwitchBanner={quickSwitchBanner}
      userCard={userCard}
      headerActions={headerActions}
      onLogout={logout}
      mainClassName="max-w-6xl"
    />
  );
}
