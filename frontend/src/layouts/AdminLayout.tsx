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
    <div className="px-5 py-3 bg-slate-50/50">
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
  );

  // Quick switch back to Learner and Teacher workspaces
  const quickSwitchBanner = (
    <div className="px-4 pt-3 pb-1 space-y-1.5">
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

      {user?.roles?.includes('TEACHER') && (
        <Link
          to="/teacher/dashboard"
          className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-xs font-semibold border border-blue-200/80 shadow-2xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span>Khu vực Giảng viên</span>
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200">
            Chuyển →
          </span>
        </Link>
      )}
    </div>
  );

  const headerActions = (
    <Link to="/quizzes">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
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
