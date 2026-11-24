import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Sanitizes redirect paths to prevent Open Redirect attacks.
 * Only allows relative paths starting with a single '/' and not '//'.
 */
export function sanitizeRedirectUrl(url: string | null): string {
  if (!url) return '/learner/dashboard';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }
  return '/learner/dashboard';
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md space-y-4 text-center">
          <SkeletonLoader className="h-10 w-48 mx-auto" />
          <SkeletonLoader className="h-4 w-64 mx-auto" />
          <p className="text-sm text-slate-500">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass current path in redirect state safely
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}
