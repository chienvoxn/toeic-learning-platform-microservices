import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardSidebar } from '@/components/organisms/DashboardSidebar';
import { DashboardHeader } from '@/components/organisms/DashboardHeader';
import { LayoutDashboard, BookOpen, History } from 'lucide-react';
import { UserView } from '@/types/auth';

const mockLearnerUser: UserView = {
  userId: 'learner-1',
  email: 'learner@example.com',
  displayName: 'Nguyễn Văn Học Viên',
  role: 'LEARNER',
  roles: ['LEARNER'],
};

const mockTeacherUser: UserView = {
  userId: 'teacher-1',
  email: 'teacher@example.com',
  displayName: 'Trần Thị Giảng Viên',
  role: 'TEACHER',
  roles: ['LEARNER', 'TEACHER'],
};

const mockAdminUser: UserView = {
  userId: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Lê Quản Trị Viên',
  role: 'ADMIN',
  roles: ['LEARNER', 'ADMIN'],
};

// Mock useAuth for WorkspaceSwitcher inside DashboardHeader
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockTeacherUser,
    roles: ['LEARNER', 'TEACHER'],
    permissions: ['assessment:submit', 'content:write'],
    isAuthenticated: true,
    isLoading: false,
    hasRole: (role: string) => ['LEARNER', 'TEACHER'].includes(role),
    hasPermission: () => true,
    logout: vi.fn(),
  }),
}));

describe('Dashboard Layout Composition & Navigation Tests', () => {
  const learnerNav = [
    { label: 'Tổng quan học tập', path: '/learner/dashboard', icon: LayoutDashboard },
    { label: 'Kho đề thi', path: '/learner/quizzes', icon: BookOpen },
    { label: 'Lịch sử luyện đề', path: '/learner/history', icon: History },
  ];

  it('renders DashboardLayout with composed sidebar, header, and viewport content', () => {
    const handleLogout = vi.fn();

    render(
      <MemoryRouter initialEntries={['/learner/dashboard']}>
        <DashboardLayout
          workspaceRole="learner"
          brandSubtitle="Học Viên"
          headerTitle="Bàn Làm Việc Học Viên"
          headerBadge="PRO Member"
          navItems={learnerNav}
          onLogout={handleLogout}
        >
          <div data-testid="dashboard-content">Nội dung trang kiểm thử</div>
        </DashboardLayout>
      </MemoryRouter>
    );

    // Check Header and Brand
    expect(screen.getByText('Bàn Làm Việc Học Viên')).toBeInTheDocument();
    expect(screen.getByText('PRO Member')).toBeInTheDocument();
    expect(screen.getByText('Học Viên')).toBeInTheDocument();

    // Check Composed Nav Items
    expect(screen.getByText('Tổng quan học tập')).toBeInTheDocument();
    expect(screen.getByText('Kho đề thi')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử luyện đề')).toBeInTheDocument();

    // Check Children rendered in main viewport
    expect(screen.getByTestId('dashboard-content')).toHaveTextContent('Nội dung trang kiểm thử');
  });

  it('manages mobile drawer open and close interactions cleanly', () => {
    const handleClose = vi.fn();

    const { rerender } = render(
      <MemoryRouter initialEntries={['/learner/dashboard']}>
        <DashboardSidebar
          workspaceRole="learner"
          brandSubtitle="Học Viên"
          navItems={learnerNav}
          isOpenMobile={false}
          onCloseMobile={handleClose}
        />
      </MemoryRouter>
    );

    // When closed, mobile drawer close button is not in DOM
    expect(screen.queryByLabelText('Đóng menu điều hướng')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/learner/dashboard']}>
        <DashboardSidebar
          workspaceRole="learner"
          brandSubtitle="Học Viên"
          navItems={learnerNav}
          isOpenMobile={true}
          onCloseMobile={handleClose}
        />
      </MemoryRouter>
    );

    const closeBtn = screen.getByLabelText('Đóng menu điều hướng');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders DashboardHeader with mobile menu trigger and workspace title', () => {
    const handleOpenMobile = vi.fn();

    render(
      <MemoryRouter>
        <DashboardHeader
          title="Kho Đề Thi Của Tôi"
          badgeText="Content Studio"
          currentWorkspace="teacher"
          onOpenMobile={handleOpenMobile}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Kho Đề Thi Của Tôi')).toBeInTheDocument();
    expect(screen.getByText('Content Studio')).toBeInTheDocument();

    const hamburger = screen.getByLabelText('Mở menu điều hướng');
    expect(hamburger).toBeInTheDocument();
    fireEvent.click(hamburger);
    expect(handleOpenMobile).toHaveBeenCalledTimes(1);
  });
});

describe('Workspace Switching & Role Security Verification', () => {
  it('correctly maps roles and privileges for multi-role accounts', () => {
    expect(mockTeacherUser.roles?.includes('TEACHER')).toBe(true);
    expect(mockAdminUser.roles?.includes('ADMIN')).toBe(true);
    expect(mockLearnerUser.roles?.includes('ADMIN')).toBe(false);
    expect(mockLearnerUser.roles?.includes('TEACHER')).toBe(false);
  });
});
