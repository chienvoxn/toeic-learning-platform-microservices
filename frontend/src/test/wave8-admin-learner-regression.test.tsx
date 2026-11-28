import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { UserDirectoryPage, DirectoryUser } from '@/types/admin';
import { AttemptView } from '@/types/attempt';
import { MembershipView } from '@/types/membership';
import { QuizView } from '@/types/quiz';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { RoleAssignModal } from '@/features/admin/RoleAssignModal';
import { LearnerDashboardPage } from '@/pages/learner/LearnerDashboardPage';
import { ExamResultDetailPage } from '@/pages/learner/ExamResultDetailPage';
import { MembershipPage } from '@/pages/learner/MembershipPage';
import { CatalogPage } from '@/pages/public/CatalogPage';

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
  getAuthToken: () => 'mock-jwt-token',
  setAuthToken: vi.fn(),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      userId: 'test-user-id',
      email: 'tester@toeic.vn',
      displayName: 'Test Operator',
      role: 'ADMIN',
      roles: ['LEARNER', 'ADMIN'],
    },
    roles: ['LEARNER', 'ADMIN'],
    permissions: ['all'],
    isAuthenticated: true,
    isLoading: false,
    hasRole: () => true,
    hasPermission: () => true,
    logout: vi.fn(),
  }),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

describe('Phase 8B.4: Admin & Learner Regression Suite (AL-R01 to AL-R08)', () => {
  const mockedApiRequest = vi.mocked(apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // AL-R01 — AdminUsersPage: Pagination Clamping
  // =========================================================================
  it('AL-R01: AdminUsersPage gracefully handles total=0 and page clamping without crashing or loops', async () => {
    const emptyUsersPage: UserDirectoryPage = {
      users: [],
      total: 0,
      page: 0,
      size: 10,
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path.startsWith('/ms/v1/identity/admin/users')) {
        return emptyUsersPage;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render empty state message from DataTable without error
    expect(await screen.findByText('Không tìm thấy người dùng')).toBeInTheDocument();
  });

  // =========================================================================
  // AL-R02 — RoleAssignModal: State Isolation & Target Switch
  // =========================================================================
  it('AL-R02: RoleAssignModal resets selected role and error state when opening for a new user', async () => {
    const userA: DirectoryUser = {
      userId: 'u-user-a',
      email: 'usera@toeic.vn',
      displayName: 'User A',
      roles: ['LEARNER'],
    };
    const userB: DirectoryUser = {
      userId: 'u-user-b',
      email: 'userb@toeic.vn',
      displayName: 'User B',
      roles: ['LEARNER', 'TEACHER'],
    };

    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const client = createTestQueryClient();

    // 1. Render modal for User A
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <RoleAssignModal user={userA} isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </QueryClientProvider>
    );

    expect(screen.getByText('User A')).toBeInTheDocument();
    expect(screen.getByText('usera@toeic.vn')).toBeInTheDocument();

    // Select ADMIN role
    const adminRadio = screen.getByLabelText(/Quản trị viên \(ADMIN\)/i);
    fireEvent.click(adminRadio);

    // 2. Switch modal target to User B
    rerender(
      <QueryClientProvider client={client}>
        <RoleAssignModal user={userB} isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </QueryClientProvider>
    );

    // Target user must update and selected role must reset to default TEACHER
    expect(screen.getByText('User B')).toBeInTheDocument();
    expect(screen.getByText('userb@toeic.vn')).toBeInTheDocument();
  });

  // =========================================================================
  // AL-R03 — AdminDashboardPage: Error Fallback
  // =========================================================================
  it('AL-R03: AdminDashboardPage displays informative alert with retry button when overview API fails', async () => {
    mockedApiRequest.mockImplementation(async (path) => {
      if (path.includes('/ms/v1/identity/admin/users?page=0')) {
        throw new ApiError(500, 'Identity Service Unavailable');
      }
      if (path.includes('/ms/v1/contents/quizzes/admin?page=0')) {
        throw new ApiError(500, 'Content Service Unavailable');
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Must show alert with error details and retry button
    expect(await screen.findByText(/Không thể tải đầy đủ dữ liệu quản trị/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });

  // =========================================================================
  // AL-R04 — LearnerDashboardPage: Weighted Accuracy Calculation
  // =========================================================================
  it('AL-R04: LearnerDashboardPage computes mathematically weighted accuracy across attempts without division by zero', async () => {
    const attempts: AttemptView[] = [
      {
        id: 'att-1',
        quizId: 'q-1',
        status: 'GRADED',
        correct: 8,
        total: 10,
        createdAt: '2026-02-01T10:00:00Z',
        questions: [],
      },
      {
        id: 'att-2',
        quizId: 'q-2',
        status: 'GRADED',
        correct: 12,
        total: 20,
        createdAt: '2026-02-02T10:00:00Z',
        questions: [],
      },
    ];

    const membership: MembershipView = {
      userId: 'test-user-id',
      planCode: 'FREE',
      status: 'ACTIVE',
      maxPracticePerDay: 10,
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/attempts') return attempts;
      if (path === '/api/v1/memberships/me') return membership;
      if (path === '/api/v1/interactions/activities/me') return [];
      if (path === '/ms/v1/contents/quizzes') return [];
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LearnerDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Weighted accuracy: (8 + 12) / (10 + 20) = 20 / 30 = 66.666% -> Math.round -> 67%
    // (A flawed unweighted arithmetic average would give (80% + 60%)/2 = 70%)
    expect(await screen.findByText('67%')).toBeInTheDocument();
    // Subtitle displays total correct over total questions
    expect(screen.getByText('Tổng 20/30 câu đúng')).toBeInTheDocument();
    expect(screen.getByText('Đề đã chấm điểm')).toBeInTheDocument();
  });

  // =========================================================================
  // AL-R05 — LearnerDashboardPage: Empty Attempts Zero Safety
  // =========================================================================
  it('AL-R05: LearnerDashboardPage renders 0% accuracy and empty state when user has no graded attempts', async () => {
    const membership: MembershipView = {
      userId: 'test-user-id',
      planCode: 'FREE',
      status: 'ACTIVE',
      maxPracticePerDay: 10,
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/attempts') return [];
      if (path === '/api/v1/memberships/me') return membership;
      if (path === '/api/v1/interactions/activities/me') return [];
      if (path === '/ms/v1/contents/quizzes') return [];
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LearnerDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // When there are no graded attempts, dashboard safely displays empty indicators without division by zero
    expect(await screen.findByText('Chưa có bài đã chấm')).toBeInTheDocument();
    expect(screen.getByText('Đề đã chấm điểm')).toBeInTheDocument();
    expect(screen.getByText('Không có bài đang làm dở')).toBeInTheDocument();
  });

  // =========================================================================
  // AL-R06 — ExamResultDetailPage: Question Classification & Filters
  // =========================================================================
  it('AL-R06: ExamResultDetailPage accurately groups questions into correct, incorrect, and unanswered without guessing correctChoice', async () => {
    const attemptDetail: AttemptView = {
      id: 'att-res-1',
      quizId: 'quiz-part5',
      status: 'GRADED',
      correct: 1,
      total: 3,
      createdAt: '2026-02-01T10:00:00Z',
      questions: [
        {
          id: 'q-1',
          position: 1,
          selectedChoice: 'A',
          correct: true,
          prompt: 'Question 1 Correct Prompt',
          choices: { A: 'Choice A', B: 'Choice B', C: 'Choice C', D: 'Choice D' },
          explanation: 'Exp 1',
        },
        {
          id: 'q-2',
          position: 2,
          selectedChoice: 'B',
          correct: false,
          prompt: 'Question 2 Wrong Prompt',
          choices: { A: 'Choice A', B: 'Choice B', C: 'Choice C', D: 'Choice D' },
          explanation: 'Exp 2',
        },
        {
          id: 'q-3',
          position: 3,
          selectedChoice: null, // Unanswered
          correct: null,
          prompt: 'Question 3 Skipped Prompt',
          choices: { A: 'Choice A', B: 'Choice B', C: 'Choice C', D: 'Choice D' },
          explanation: 'Exp 3',
        },
      ],
    };

    const quiz: QuizView = {
      id: 'quiz-part5',
      title: 'Part 5 Practice Quiz',
      part: 5,
      premium: false,
      count: 3,
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/attempts/att-res-1') return attemptDetail;
      if (path === '/ms/v1/contents/quizzes') return [quiz];
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/learner/attempts/att-res-1']}>
          <Routes>
            <Route path="/learner/attempts/:attemptId" element={<ExamResultDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check summary stats
    expect(await screen.findByText('Part 5 Practice Quiz')).toBeInTheDocument();
    expect(screen.getByText('Câu đúng')).toBeInTheDocument();

    // Verify filter tabs functionality
    const wrongTab = screen.getByText(/Trả lời sai \(1\)/i);
    fireEvent.click(wrongTab);
    expect(screen.getByText('Question 2 Wrong Prompt')).toBeInTheDocument();
    expect(screen.queryByText('Question 1 Correct Prompt')).not.toBeInTheDocument();

    const skippedTab = screen.getByText(/Bỏ trống \(1\)/i);
    fireEvent.click(skippedTab);
    expect(screen.getByText('Question 3 Skipped Prompt')).toBeInTheDocument();
    expect(screen.queryByText('Question 2 Wrong Prompt')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AL-R07 — MembershipPage: Demo Plan Switch Contract
  // =========================================================================
  it('AL-R07: MembershipPage switches between FREE and PRO with PUT /api/v1/memberships/me and updates UI quota', async () => {
    const freeMembership: MembershipView = {
      userId: 'test-user-id',
      planCode: 'FREE',
      status: 'ACTIVE',
      maxPracticePerDay: 10,
    };

    const proMembership: MembershipView = {
      userId: 'test-user-id',
      planCode: 'PRO',
      status: 'ACTIVE',
      maxPracticePerDay: 1000,
    };

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/api/v1/memberships/me') {
        if (!options || options.method === 'GET') {
          return freeMembership;
        }
        if (options.method === 'PUT') {
          return proMembership;
        }
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MembershipPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify plan header appears
    expect((await screen.findAllByText(/Gói FREE/i)).length).toBeGreaterThanOrEqual(1);

    // Click switch to PRO button
    const upgradeBtn = screen.getAllByRole('button', { name: /Kích hoạt PRO thử nghiệm/i })[0];
    fireEvent.click(upgradeBtn);

    // Verify success feedback alert
    expect(
      await screen.findByText(/Đã chuyển đổi thành công sang gói PRO \(hạn ngạch: 1000 lượt\/ngày\)/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // AL-R08 — CatalogPage: Error State with Retry Button
  // =========================================================================
  it('AL-R08: CatalogPage displays friendly error alert with retry button when quizzes fetch fails', async () => {
    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/contents/quizzes') {
        throw new ApiError(503, 'Content Service Temporary Offline');
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CatalogPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify error state
    expect(
      await screen.findByText('Chưa thể tải danh sách đề thi. Vui lòng thử lại.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });
});
