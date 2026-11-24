import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LearnerLayout } from '@/layouts/LearnerLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ExamLayout } from '@/layouts/ExamLayout';

import { ProtectedRoute } from '@/components/navigation/ProtectedRoute';
import { RoleGuard } from '@/components/navigation/RoleGuard';

import { DesignSystemPreview } from '@/pages/DesignSystemPreview';
import { LandingPage } from '@/pages/public/LandingPage';
import { CatalogPage } from '@/pages/public/CatalogPage';
import { QuizDetailPage } from '@/pages/public/QuizDetailPage';
import { PricingPage } from '@/pages/public/PricingPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { ForbiddenPage } from '@/pages/public/ForbiddenPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

import { LearnerDashboardPage } from '@/pages/learner/LearnerDashboardPage';
import { ExamHistoryPage } from '@/pages/learner/ExamHistoryPage';
import { ExamResultDetailPage } from '@/pages/learner/ExamResultDetailPage';
import { ProfilePage } from '@/pages/learner/ProfilePage';
import { MembershipPage } from '@/pages/learner/MembershipPage';

import { TeacherDashboardPage } from '@/pages/teacher/TeacherDashboardPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ExamScreenPage } from '@/pages/exam/ExamScreenPage';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'preview', element: <DesignSystemPreview /> },
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
        <LearnerLayout />
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
          <ExamLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { path: ':attemptId', element: <ExamScreenPage /> },
    ],
  },

  // Teacher routes (requires content:write permission)
  {
    path: '/teacher',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredPermission="content:write">
          <TeacherLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/teacher/dashboard" replace /> },
      { path: 'dashboard', element: <TeacherDashboardPage /> },
      { path: 'quizzes', element: <TeacherDashboardPage /> },
      { path: 'quizzes/new', element: <TeacherDashboardPage /> },
    ],
  },

  // Admin routes (requires rbac:manage permission)
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredPermission="rbac:manage">
          <AdminLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminDashboardPage /> },
      { path: 'quizzes', element: <AdminDashboardPage /> },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
