import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LearnerLayout } from '@/layouts/LearnerLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ExamLayout } from '@/layouts/ExamLayout';

import { ProtectedRoute } from '@/components/navigation/ProtectedRoute';
import { RoleGuard } from '@/components/navigation/RoleGuard';
import { PageLoading } from '@/components/feedback/PageLoading';

// Route-level Lazy Loading for bundle optimization & code splitting
const LandingPage = lazy(() => import('@/pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const CatalogPage = lazy(() => import('@/pages/public/CatalogPage').then(m => ({ default: m.CatalogPage })));
const QuizDetailPage = lazy(() => import('@/pages/public/QuizDetailPage').then(m => ({ default: m.QuizDetailPage })));
const PricingPage = lazy(() => import('@/pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const LoginPage = lazy(() => import('@/pages/public/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForbiddenPage = lazy(() => import('@/pages/public/ForbiddenPage').then(m => ({ default: m.ForbiddenPage })));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const LearnerDashboardPage = lazy(() => import('@/pages/learner/LearnerDashboardPage').then(m => ({ default: m.LearnerDashboardPage })));
const ExamHistoryPage = lazy(() => import('@/pages/learner/ExamHistoryPage').then(m => ({ default: m.ExamHistoryPage })));
const ExamResultDetailPage = lazy(() => import('@/pages/learner/ExamResultDetailPage').then(m => ({ default: m.ExamResultDetailPage })));
const ProfilePage = lazy(() => import('@/pages/learner/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MembershipPage = lazy(() => import('@/pages/learner/MembershipPage').then(m => ({ default: m.MembershipPage })));

const TeacherDashboardPage = lazy(() => import('@/pages/teacher/TeacherDashboardPage').then(m => ({ default: m.TeacherDashboardPage })));
const TeacherQuizzesPage = lazy(() => import('@/pages/teacher/TeacherQuizzesPage').then(m => ({ default: m.TeacherQuizzesPage })));
const QuizCreatePage = lazy(() => import('@/pages/teacher/QuizCreatePage').then(m => ({ default: m.QuizCreatePage })));
const QuizEditPage = lazy(() => import('@/pages/teacher/QuizEditPage').then(m => ({ default: m.QuizEditPage })));

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminQuizzesPage = lazy(() => import('@/pages/admin/AdminQuizzesPage').then(m => ({ default: m.AdminQuizzesPage })));

const ExamScreenPage = lazy(() => import('@/pages/exam/ExamScreenPage').then(m => ({ default: m.ExamScreenPage })));

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoading />}>
        <PublicLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'preview', element: <Navigate to="/" replace /> },
      { path: 'quizzes', element: <CatalogPage /> },
      { path: 'quizzes/:id', element: <QuizDetailPage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '403', element: <ForbiddenPage /> },
      { path: '404', element: <NotFoundPage /> },
    ],
  },

  // Learner routes (requires authentication)
  {
    path: '/learner',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoading />}>
          <LearnerLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/learner/dashboard" replace /> },
      { path: 'dashboard', element: <LearnerDashboardPage /> },
      { path: 'quizzes', element: <CatalogPage /> },
      { path: 'history', element: <ExamHistoryPage /> },
      { path: 'results/:attemptId', element: <ExamResultDetailPage /> },
      { path: 'membership', element: <MembershipPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // Exam routes (fullscreen examination canvas)
  {
    path: '/exam',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredPermission="assessment:submit">
          <Suspense fallback={<PageLoading />}>
            <ExamLayout />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { path: ':attemptId', element: <ExamScreenPage /> },
    ],
  },

  // Teacher routes (requires content:write or TEACHER role)
  {
    path: '/teacher',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="TEACHER">
          <Suspense fallback={<PageLoading />}>
            <TeacherLayout />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/teacher/dashboard" replace /> },
      { path: 'dashboard', element: <TeacherDashboardPage /> },
      { path: 'quizzes', element: <TeacherQuizzesPage /> },
      { path: 'quizzes/new', element: <QuizCreatePage /> },
      { path: 'quizzes/:id/edit', element: <QuizEditPage /> },
    ],
  },

  // Admin routes (requires rbac:manage or ADMIN role)
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="ADMIN">
          <Suspense fallback={<PageLoading />}>
            <AdminLayout />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'quizzes', element: <AdminQuizzesPage /> },
    ],
  },

  // Global fallback
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
]);
