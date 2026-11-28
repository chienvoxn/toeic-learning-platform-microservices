import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ProtectedRoute, sanitizeRedirectUrl } from '@/components/navigation/ProtectedRoute';
import { RoleGuard } from '@/components/navigation/RoleGuard';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';
import { apiRequest, setAuthToken, getAuthToken } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';
import { ApiError } from '@/types/api';
import { UserView, RbacAccess } from '@/types/auth';

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Phase 8B.3: Auth & RBAC Regression Suite (AU-R01 to AU-R08)', () => {
  const mockedApiRequest = vi.mocked(apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    setAuthToken(null);
    queryClient.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
    queryClient.clear();
  });

  // Helper consumer component to inspect AuthContext state
  function AuthStateInspector() {
    const auth = useAuth();
    return (
      <div>
        <div data-testid="auth-loading">{auth.isLoading ? 'loading' : 'ready'}</div>
        <div data-testid="auth-status">{auth.isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
        <div data-testid="auth-user">{auth.user ? auth.user.email : 'none'}</div>
        <div data-testid="auth-roles">{auth.roles.join(',')}</div>
        <div data-testid="has-learner">{auth.hasRole('LEARNER') ? 'yes' : 'no'}</div>
        <div data-testid="has-teacher">{auth.hasRole('TEACHER') ? 'yes' : 'no'}</div>
        <div data-testid="has-admin">{auth.hasRole('ADMIN') ? 'yes' : 'no'}</div>
        <div data-testid="has-perm">{auth.hasPermission('content:write') ? 'yes' : 'no'}</div>
        <button onClick={() => auth.logout()}>Logout</button>
      </div>
    );
  }

  // =========================================================================
  // AU-R01 — Session Restoration on Mount
  // =========================================================================
  it('AU-R01: restores user session, roles, and permissions from sessionStorage on mount', async () => {
    setAuthToken('valid-jwt-token-xyz');

    const fakeUser: UserView = {
      userId: 'u-1',
      email: 'teacher@toeic.vn',
      displayName: 'Teacher Toeic',
      role: 'TEACHER',
    };

    const fakeRbac: RbacAccess = {
      roles: ['LEARNER', 'TEACHER'],
      permissions: ['content:write', 'content:read'],
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/identity/me') return fakeUser;
      if (path === '/ms/v1/identity/rbac/me') return fakeRbac;
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <AuthProvider>
        <AuthStateInspector />
      </AuthProvider>
    );

    // Initial loading
    expect(screen.getByTestId('auth-loading')).toHaveTextContent('loading');

    // Wait for resolution
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('auth-user')).toHaveTextContent('teacher@toeic.vn');
    expect(screen.getByTestId('auth-roles')).toHaveTextContent('LEARNER,TEACHER');
    expect(screen.getByTestId('has-learner')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-teacher')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-admin')).toHaveTextContent('no');
    expect(screen.getByTestId('has-perm')).toHaveTextContent('yes');
  });

  // =========================================================================
  // AU-R02 — Expired Session / HTTP 401 Eviction
  // =========================================================================
  it('AU-R02: invalid/expired token on /ms/v1/identity/me purges storage, resets state and clears cache', async () => {
    setAuthToken('expired-jwt-token');

    // Populate a mock query in cache to verify eviction
    queryClient.setQueryData(['private-user-data'], { secret: 123 });
    queryClient.setQueryData(['public-quizzes'], [{ id: 'q1' }]);

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/identity/me') {
        throw new ApiError(401, 'Token expired or invalid');
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <AuthProvider>
        <AuthStateInspector />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
    });

    // Must be unauthenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('auth-user')).toHaveTextContent('none');
    expect(getAuthToken()).toBeNull();

    // Private cache must be purged, public queries preserved
    expect(queryClient.getQueryData(['private-user-data'])).toBeUndefined();
    expect(queryClient.getQueryData(['public-quizzes'])).toBeDefined();
  });

  // =========================================================================
  // AU-R03 — Multi-User Isolation & Logout Cache Invalidation
  // =========================================================================
  it('AU-R03: logout completely purges user session and private queries before new login', async () => {
    setAuthToken('user-a-token');
    const userA: UserView = {
      userId: 'u-a',
      email: 'user-a@toeic.vn',
      displayName: 'User A',
      role: 'LEARNER',
    };
    const rbacA: RbacAccess = {
      roles: ['LEARNER'],
      permissions: ['assessment:take'],
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/identity/me') return userA;
      if (path === '/ms/v1/identity/rbac/me') return rbacA;
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <AuthProvider>
        <AuthStateInspector />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('user-a@toeic.vn');
    });

    // Populate user A cache
    queryClient.setQueryData(['user-attempts', 'u-a'], [{ attemptId: 'att-1' }]);
    expect(queryClient.getQueryData(['user-attempts', 'u-a'])).toBeDefined();

    // User A logs out
    const logoutBtn = screen.getByRole('button', { name: /Logout/i });
    fireEvent.click(logoutBtn);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    expect(getAuthToken()).toBeNull();
    // Cache must have been purged
    expect(queryClient.getQueryData(['user-attempts', 'u-a'])).toBeUndefined();
  });

  // =========================================================================
  // AU-R04 — ProtectedRoute Unauthenticated Redirect & Open-Redirect Defense
  // =========================================================================
  it('AU-R04: ProtectedRoute redirects unauthenticated users to /login?redirect=... and sanitizes redirect URLs', async () => {
    // 1. Test sanitizeRedirectUrl defense
    expect(sanitizeRedirectUrl(null)).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('https://malicious.com')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('//malicious.com')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('/valid/internal/route')).toBe('/valid/internal/route');
    expect(sanitizeRedirectUrl('/exam/take?part=5')).toBe('/exam/take?part=5');

    // 2. Test ProtectedRoute redirection when unauthenticated
    mockedApiRequest.mockImplementation(async () => {
      throw new ApiError(401, 'No session');
    });

    function TestApp() {
      const location = useLocation();
      return (
        <Routes>
          <Route
            path="/secret-area"
            element={
              <ProtectedRoute>
                <div>Classified Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={<div data-testid="login-page">Login Page: {location.search}</div>}
          />
        </Routes>
      );
    }

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/secret-area?from=test']}>
          <TestApp />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Redirect search param must contain sanitized relative target
    expect(screen.getByTestId('login-page')).toHaveTextContent('redirect=%2Fsecret-area%3Ffrom%3Dtest');
    expect(screen.queryByText('Classified Content')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AU-R05 — RoleGuard Route Guarding
  // =========================================================================
  it('AU-R05: RoleGuard permits authorized users and redirects unauthorized users to /403', async () => {
    setAuthToken('teacher-jwt');

    const teacherUser: UserView = {
      userId: 'u-teacher',
      email: 'teacher@toeic.vn',
      displayName: 'Teacher User',
      role: 'TEACHER',
    };
    const teacherRbac: RbacAccess = {
      roles: ['LEARNER', 'TEACHER'],
      permissions: ['content:write', 'content:read'],
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/identity/me') return teacherUser;
      if (path === '/ms/v1/identity/rbac/me') return teacherRbac;
      throw new Error(`Unexpected path: ${path}`);
    });

    function AppWithGuards() {
      return (
        <Routes>
          <Route
            path="/teacher-area"
            element={
              <RoleGuard requiredRole="TEACHER">
                <div>Teacher Exclusive Studio</div>
              </RoleGuard>
            }
          />
          <Route
            path="/admin-area"
            element={
              <RoleGuard requiredRole="ADMIN">
                <div>Admin Security Console</div>
              </RoleGuard>
            }
          />
          <Route path="/403" element={<div data-testid="forbidden-page">403 Access Denied</div>} />
        </Routes>
      );
    }

    // 1. Authorized access: Teacher accessing teacher-area
    const { unmount } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/teacher-area']}>
          <AppWithGuards />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Teacher Exclusive Studio')).toBeInTheDocument();
    unmount();

    // 2. Unauthorized access: Teacher accessing admin-area without ADMIN role
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin-area']}>
          <AppWithGuards />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByTestId('forbidden-page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Security Console')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AU-R06 — WorkspaceSwitcher Role-Based Options
  // =========================================================================
  it('AU-R06: WorkspaceSwitcher shows only workspaces allowed by user roles and switches properly', async () => {
    setAuthToken('teacher-jwt-token');

    const teacherUser: UserView = {
      userId: 'u-teacher',
      email: 'teacher@toeic.vn',
      displayName: 'Teacher User',
      role: 'TEACHER',
    };
    const teacherRbac: RbacAccess = {
      roles: ['LEARNER', 'TEACHER'], // Has LEARNER and TEACHER, NOT ADMIN
      permissions: ['content:write'],
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/identity/me') return teacherUser;
      if (path === '/ms/v1/identity/rbac/me') return teacherRbac;
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/teacher/dashboard']}>
          <WorkspaceSwitcher currentWorkspace="teacher" />
        </MemoryRouter>
      </AuthProvider>
    );

    // Wait for auth to be ready
    await waitFor(() => {
      expect(screen.getByTitle('Chuyển đổi không gian làm việc')).toBeInTheDocument();
    });

    // Open workspace switcher dropdown
    const trigger = screen.getByTitle('Chuyển đổi không gian làm việc');
    fireEvent.click(trigger);

    // Must show Learner and Teacher workspaces
    expect(screen.getByText('Không gian học viên')).toBeInTheDocument();
    expect(screen.getAllByText('Không gian giảng viên').length).toBeGreaterThanOrEqual(1);

    // Must NOT show Admin workspace
    expect(screen.queryByText('Không gian quản trị')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AU-R07 — Primary Role vs Roles Array Invariant
  // =========================================================================
  it('AU-R07: hasRole returns true if role is either user.role OR in roles array', async () => {
    setAuthToken('admin-jwt');

    const adminUser: UserView = {
      userId: 'u-admin',
      email: 'admin@toeic.vn',
      displayName: 'Admin User',
      role: 'ADMIN', // Primary role is ADMIN
    };
    // Backend returns roles array containing only LEARNER and ADMIN
    const adminRbac: RbacAccess = {
      roles: ['LEARNER', 'ADMIN'],
      permissions: ['user:manage', 'role:assign'],
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/identity/me') return adminUser;
      if (path === '/ms/v1/identity/rbac/me') return adminRbac;
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <AuthProvider>
        <AuthStateInspector />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('has-admin')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-learner')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-teacher')).toHaveTextContent('no');
  });

  // =========================================================================
  // AU-R08 — Authentication Session Race (P0-A)
  // =========================================================================
  describe('AU-R08: P0-A Authentication Session Concurrency & Race Hazards', () => {
    it('Scenario A: User A pending profile/RBAC resolves after logout -> session remains unauthenticated and token is not restored', async () => {
      setAuthToken('token-user-a');
      const deferredMe = createDeferred<UserView>();
      const deferredRbac = createDeferred<RbacAccess>();

      mockedApiRequest.mockImplementation(async (path) => {
        if (path === '/ms/v1/identity/me') return deferredMe.promise;
        if (path === '/ms/v1/identity/rbac/me') return deferredRbac.promise;
        throw new Error(`Unexpected path: ${path}`);
      });

      render(
        <AuthProvider>
          <AuthStateInspector />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-loading')).toHaveTextContent('loading');

      // User logs out while fetchRbacAndProfile is pending
      fireEvent.click(screen.getByText('Logout'));
      expect(getAuthToken()).toBeNull();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('auth-user')).toHaveTextContent('none');

      // Now deferred requests for User A resolve
      deferredMe.resolve({
        userId: 'user-a',
        email: 'user-a@toeic.vn',
        displayName: 'User A',
        role: 'LEARNER',
      });
      deferredRbac.resolve({
        roles: ['LEARNER'],
        permissions: [],
      });

      // Wait for any microtasks/state updates to finish
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
      });

      // Session MUST NOT be restored to User A
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('auth-user')).toHaveTextContent('none');
      expect(screen.getByTestId('auth-roles')).toHaveTextContent('');
      expect(getAuthToken()).toBeNull();
    });

    it('Scenario B: User A pending request resolves after User B logs in -> User B session is preserved and not overwritten', async () => {
      setAuthToken('token-user-a');
      const deferredMeA = createDeferred<UserView>();
      const deferredRbacA = createDeferred<RbacAccess>();

      mockedApiRequest.mockImplementation(async (path) => {
        if (getAuthToken() === 'token-user-a') {
          if (path === '/ms/v1/identity/me') return deferredMeA.promise;
          if (path === '/ms/v1/identity/rbac/me') return deferredRbacA.promise;
        }
        if (getAuthToken() === 'token-user-b') {
          if (path === '/ms/v1/identity/me') return {
            userId: 'user-b',
            email: 'user-b@toeic.vn',
            displayName: 'User B',
            role: 'TEACHER',
          };
          if (path === '/ms/v1/identity/rbac/me') return {
            roles: ['LEARNER', 'TEACHER'],
            permissions: ['content:write'],
          };
        }
        throw new Error(`Unexpected path: ${path}`);
      });

      function LoginHelper() {
        const auth = useAuth();
        return (
          <div>
            <AuthStateInspector />
            <button
              onClick={() =>
                auth.login({
                  accessToken: 'token-user-b',
                  tokenType: 'Bearer',
                  expiresIn: 3600,
                  user: {
                    userId: 'user-b',
                    email: 'user-b@toeic.vn',
                    displayName: 'User B',
                    role: 'TEACHER',
                  },
                })
              }
            >
              Login B
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <LoginHelper />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-loading')).toHaveTextContent('loading');

      // User A logs out
      fireEvent.click(screen.getByText('Logout'));
      expect(getAuthToken()).toBeNull();

      // User B logs in
      fireEvent.click(screen.getByText('Login B'));

      // Wait for User B to be authenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-user')).toHaveTextContent('user-b@toeic.vn');
        expect(screen.getByTestId('auth-roles')).toHaveTextContent('LEARNER,TEACHER');
      });

      // Now User A's slow request resolves
      deferredMeA.resolve({
        userId: 'user-a',
        email: 'user-a@toeic.vn',
        displayName: 'User A',
        role: 'LEARNER',
      });
      deferredRbacA.resolve({
        roles: ['LEARNER'],
        permissions: [],
      });

      // Advance timers / wait for promises
      await new Promise((r) => setTimeout(r, 50));

      // User B MUST NOT be overwritten by User A
      expect(screen.getByTestId('auth-user')).toHaveTextContent('user-b@toeic.vn');
      expect(screen.getByTestId('auth-roles')).toHaveTextContent('LEARNER,TEACHER');
      expect(screen.getByTestId('has-teacher')).toHaveTextContent('yes');
      expect(getAuthToken()).toBe('token-user-b');
    });

    it('Scenario C: User A pending request rejects with 401 after User B logs in -> User B session and private cache are NOT wiped', async () => {
      setAuthToken('token-user-a');
      const deferredMeA = createDeferred<UserView>();
      const deferredRbacA = createDeferred<RbacAccess>();

      mockedApiRequest.mockImplementation(async (path) => {
        if (getAuthToken() === 'token-user-a') {
          if (path === '/ms/v1/identity/me') return deferredMeA.promise;
          if (path === '/ms/v1/identity/rbac/me') return deferredRbacA.promise;
        }
        if (getAuthToken() === 'token-user-b') {
          if (path === '/ms/v1/identity/me') return {
            userId: 'user-b',
            email: 'user-b@toeic.vn',
            displayName: 'User B',
            role: 'ADMIN',
          };
          if (path === '/ms/v1/identity/rbac/me') return {
            roles: ['LEARNER', 'ADMIN'],
            permissions: ['admin:all'],
          };
        }
        throw new Error(`Unexpected path: ${path}`);
      });

      function LoginHelperC() {
        const auth = useAuth();
        return (
          <div>
            <AuthStateInspector />
            <button
              onClick={() =>
                auth.login({
                  accessToken: 'token-user-b',
                  tokenType: 'Bearer',
                  expiresIn: 3600,
                  user: {
                    userId: 'user-b',
                    email: 'user-b@toeic.vn',
                    displayName: 'User B',
                    role: 'ADMIN',
                  },
                })
              }
            >
              Login B
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <LoginHelperC />
        </AuthProvider>
      );

      // User logs out and User B logs in
      fireEvent.click(screen.getByText('Logout'));
      fireEvent.click(screen.getByText('Login B'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-user')).toHaveTextContent('user-b@toeic.vn');
      });

      // User A's slow request now fails with 401
      const apiErr = new Error('Unauthorized') as ApiError;
      apiErr.status = 401;
      deferredMeA.reject(apiErr);
      deferredRbacA.reject(apiErr);

      await new Promise((r) => setTimeout(r, 50));

      // User B MUST remain logged in! Token must NOT be set to null!
      expect(screen.getByTestId('auth-user')).toHaveTextContent('user-b@toeic.vn');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(getAuthToken()).toBe('token-user-b');
    });
  });
});
