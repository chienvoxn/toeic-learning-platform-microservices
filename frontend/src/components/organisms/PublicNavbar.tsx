import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';
import { LogIn, UserPlus, LogOut, Menu, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  LEARNER: 'Học viên',
  TEACHER: 'Giảng viên',
  ADMIN: 'Quản trị viên',
};

function formatRoleList(roles?: string[]): string {
  if (!roles || roles.length === 0) return 'Học viên';
  return roles.map((r) => ROLE_LABELS[r.toUpperCase()] || r).join(', ');
}

export function PublicNavbar() {
  const { isAuthenticated, user, hasRole, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getWorkspacePath = () => {
    if (hasRole('ADMIN')) return '/admin/dashboard';
    if (hasRole('TEACHER')) return '/teacher/dashboard';
    return '/learner/dashboard';
  };

  const getCurrentWorkspaceType = () => {
    if (hasRole('ADMIN')) return 'admin';
    if (hasRole('TEACHER')) return 'teacher';
    return 'learner';
  };

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Kho đề thi', path: '/quizzes' },
    { label: 'Gói hội viên', path: '/pricing' },
  ];

  const isNavActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-surface text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Editorial Brand Mark */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <div className="h-9 w-9 rounded-sm border-[1.5px] border-border bg-primary text-foreground shadow-subtle flex items-center justify-center shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 5.5H20V9H13.75V19H10.25V9H4V5.5Z" fill="currentColor" />
              <rect x="16.5" y="13" width="3.5" height="6" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-foreground tracking-tight leading-none">
              TOEIC Master
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mt-1">
              Listening &amp; Reading · Practice Lab
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm" aria-label="Điều hướng chính">
          {navLinks.map((link) => {
            const active = isNavActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'px-3.5 py-1.5 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary text-foreground border-border font-bold shadow-subtle'
                    : 'border-transparent text-ink-muted font-semibold hover:text-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <WorkspaceSwitcher currentWorkspace={getCurrentWorkspaceType()} compact />

              <Link to={getWorkspacePath()}>
                <Button variant="primary" size="sm" className="gap-1.5">
                  <span className="truncate max-w-[140px]">{user?.displayName || 'Vào học'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="text-ink-muted hover:text-foreground hover:bg-destructive/30"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  <UserPlus className="h-4 w-4" /> Đăng ký miễn phí
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-sm border border-border bg-surface text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-b-2 border-border bg-surface px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-1.5">
            {navLinks.map((link) => {
              const active = isNavActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3.5 py-2.5 rounded-sm border text-sm font-bold',
                    active
                      ? 'bg-primary text-foreground border-border'
                      : 'border-transparent text-foreground hover:bg-muted'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border/20 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 bg-background border border-border rounded-sm flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-foreground truncate">{user?.displayName}</span>
                  <span className="font-sans font-semibold text-ink-muted shrink-0">{formatRoleList(user?.roles)}</span>
                </div>
                <Link to={getWorkspacePath()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    Vào Không Gian Học Tập
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    <LogIn className="h-4 w-4" /> Đăng nhập
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    <UserPlus className="h-4 w-4" /> Đăng ký miễn phí
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
