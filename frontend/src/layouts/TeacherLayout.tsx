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
  ExternalLink,
} from 'lucide-react';

export function TeacherLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Bàn làm việc giảng viên', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Kho đề thi của tôi', path: '/teacher/quizzes', icon: ListChecks },
    { label: 'Biên soạn đề mới', path: '/teacher/quizzes/new', icon: BookPlus },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/teacher/quizzes/new') return 'Biên Soạn Đề Thi Mới';
    if (location.pathname.includes('/edit')) return 'Chỉnh Sửa Đề Thi';
    if (location.pathname === '/teacher/quizzes') return 'Kho Đề Thi Của Tôi';
    return 'Không Gian Giảng Viên';
  };

  // User summary block
  const userCard = (
    <div className="px-5 py-3 bg-slate-50/50">
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
  );

  // Quick switch back to Learner workspace
  const quickSwitchBanner = (
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
  );

  // Header action: link to public website
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
      workspaceRole="teacher"
      brandSubtitle="Khu Vực Giảng Viên"
      headerTitle={getPageTitle()}
      headerBadge="Content Studio"
      navItems={navItems}
      quickSwitchBanner={quickSwitchBanner}
      userCard={userCard}
      headerActions={headerActions}
      onLogout={logout}
      mainClassName="max-w-6xl"
    />
  );
}
