import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CsvImportModal } from '@/features/teacher/CsvImportModal';
import { RoleAssignModal } from '@/features/admin/RoleAssignModal';
import { AdminLayout } from '@/layouts/AdminLayout';
import { DirectoryUser } from '@/types/admin';

// Mock AuthContext
let mockUser = {
  userId: 'admin-1',
  email: 'admin@toeic.vn',
  displayName: 'Admin User',
  role: 'ADMIN',
  roles: ['ADMIN'] as string[],
};

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    roles: mockUser.roles,
    permissions: ['all'],
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r: string) => mockUser.roles.includes(r),
    hasPermission: () => true,
    logout: vi.fn(),
  }),
}));

// Mock apiRequest
vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn().mockResolvedValue([]),
}));

describe('Finding #1 Regression: CsvImportModal Question Preview', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImportSuccess: vi.fn(),
  };

  it('does not render preview when CSV has 0 valid questions', () => {
    render(<CsvImportModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/prompt,a,b,c,d,answer,explanation/i);
    // Paste invalid CSV with no questions
    fireEvent.change(textarea, { target: { value: 'invalid,header,row' } });

    expect(screen.queryByText(/Xem trước/i)).not.toBeInTheDocument();
    const importBtn = screen.getByRole('button', { name: /Nhập 0 câu hỏi vào đề/i });
    expect(importBtn).toBeDisabled();
  });

  it('renders preview for all questions when under 3 questions (< 3)', () => {
    render(<CsvImportModal {...defaultProps} />);

    const valid2Csv = `prompt,a,b,c,d,answer,explanation
"Question 1","Opt A","Opt B","Opt C","Opt D","A","Explain 1"
"Question 2","Opt A","Opt B","Opt C","Opt D","B","Explain 2"`;

    const textarea = screen.getByPlaceholderText(/prompt,a,b,c,d,answer,explanation/i);
    fireEvent.change(textarea, { target: { value: valid2Csv } });

    expect(screen.getByText('Xem trước 2 câu đầu:')).toBeInTheDocument();
    expect(screen.getByText('2 / 2 câu')).toBeInTheDocument();
    expect(screen.getByText(/#1: Question 1/i)).toBeInTheDocument();
    expect(screen.getByText(/#2: Question 2/i)).toBeInTheDocument();

    const importBtn = screen.getByRole('button', { name: /Nhập 2 câu hỏi vào đề/i });
    expect(importBtn).toBeEnabled();
  });

  it('limits preview to first 3 questions when parsed questions exceed 3 (> 3)', () => {
    render(<CsvImportModal {...defaultProps} />);

    const valid5Csv = `prompt,a,b,c,d,answer,explanation
"Question 1","Opt A","Opt B","Opt C","Opt D","A","Exp 1"
"Question 2","Opt A","Opt B","Opt C","Opt D","B","Exp 2"
"Question 3","Opt A","Opt B","Opt C","Opt D","C","Exp 3"
"Question 4","Opt A","Opt B","Opt C","Opt D","D","Exp 4"
"Question 5","Opt A","Opt B","Opt C","Opt D","A","Exp 5"`;

    const textarea = screen.getByPlaceholderText(/prompt,a,b,c,d,answer,explanation/i);
    fireEvent.change(textarea, { target: { value: valid5Csv } });

    expect(screen.getByText('Xem trước 3 câu đầu:')).toBeInTheDocument();
    expect(screen.getByText('3 / 5 câu')).toBeInTheDocument();
    expect(screen.getByText(/#1: Question 1/i)).toBeInTheDocument();
    expect(screen.getByText(/#2: Question 2/i)).toBeInTheDocument();
    expect(screen.getByText(/#3: Question 3/i)).toBeInTheDocument();
    // Question 4 & 5 should not be in the preview
    expect(screen.queryByText(/#4: Question 4/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/#5: Question 5/i)).not.toBeInTheDocument();

    const importBtn = screen.getByRole('button', { name: /Nhập 5 câu hỏi vào đề/i });
    expect(importBtn).toBeEnabled();
  });
});

describe('Finding #2 Regression: AdminLayout Teacher Quick-Switch Link', () => {
  beforeEach(() => {
    mockUser = {
      userId: 'admin-1',
      email: 'admin@toeic.vn',
      displayName: 'Admin User',
      role: 'ADMIN',
      roles: ['ADMIN'],
    };
  });

  it('renders only Learner quick-switch when Admin lacks TEACHER role', () => {
    mockUser.roles = ['ADMIN'];

    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    // Learner link is always present
    expect(screen.getByText('Khu vực Học viên')).toBeInTheDocument();
    // Teacher quick switch should NOT be present
    expect(screen.queryByText('Khu vực Giảng viên')).not.toBeInTheDocument();
  });

  it('renders both Learner and Teacher quick-switch links when Admin has TEACHER role', () => {
    mockUser.roles = ['ADMIN', 'TEACHER'];

    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Khu vực Học viên')).toBeInTheDocument();
    expect(screen.getByText('Khu vực Giảng viên')).toBeInTheDocument();
  });
});

describe('Finding #3 Regression: RoleAssignModal Baseline Submit Behavior', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const targetUser: DirectoryUser = {
    userId: 'user-100',
    email: 'teacher@toeic.vn',
    displayName: 'Teacher User',
    roles: ['LEARNER', 'TEACHER'],
  };

  it('displays warning banner but keeps submit button enabled when user already has role', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RoleAssignModal
          isOpen={true}
          user={targetUser}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Default selectedRole is TEACHER, which targetUser already has
    expect(screen.getByText(/Lưu ý: Người dùng này đã sở hữu vai trò/i)).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống sẽ giữ nguyên và xác nhận lại quyền/i)).toBeInTheDocument();

    // Submit button must NOT be disabled (baseline behavior)
    const submitBtn = screen.getByRole('button', { name: /Xác nhận cấp vai trò TEACHER/i });
    expect(submitBtn).toBeEnabled();
  });

  it('does not display warning banner when user does not have the selected role', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RoleAssignModal
          isOpen={true}
          user={targetUser}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Click on ADMIN radio option
    const adminRadio = screen.getByRole('radio', { name: /Quản trị viên \(ADMIN\)/i });
    fireEvent.click(adminRadio);

    // Warning banner should disappear
    expect(screen.queryByText(/Lưu ý: Người dùng này đã sở hữu vai trò/i)).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Xác nhận cấp vai trò ADMIN/i });
    expect(submitBtn).toBeEnabled();
  });
});

describe('Finding #5 & Scope: LearnerDashboardPage MetricCard Adoption', () => {
  it('renders all 4 statistics cards with MetricCard molecules and data', async () => {
    const { LearnerDashboardPage } = await import('@/pages/learner/LearnerDashboardPage');
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Seed query cache with sample data so metrics are computed and displayed
    queryClient.setQueryData(['learner-attempts'], []);
    queryClient.setQueryData(['learner-membership'], { planCode: 'PRO', dailyLimit: 10, usedToday: 2 });
    queryClient.setQueryData(['learner-activities'], []);
    queryClient.setQueryData(['public-quizzes'], []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LearnerDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check titles of the 4 MetricCard molecules
    expect(screen.getByText('Lượt thi hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Gói Hội Viên')).toBeInTheDocument();
    expect(screen.getByText('Đề Đã Chấm Điểm')).toBeInTheDocument();
    expect(screen.getByText('Độ Chính Xác Trung Bình')).toBeInTheDocument();

    // Check Quota reset note
    expect(screen.getByText('Làm mới lúc 00:00 UTC')).toBeInTheDocument();
    // Check Membership manage link
    expect(screen.getByText(/Quản lý gói/i)).toBeInTheDocument();
  });
});
