import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';
import { GraduationCap, LogIn, UserPlus, LogOut, Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    { label: 'Kho Đề Thi TOEIC', path: '/quizzes' },
    { label: 'Gói Hội Viên', path: '/pricing' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:bg-primary-hover transition-colors">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-slate-900 tracking-tight leading-tight group-hover:text-primary transition-colors">
              TOEIC Master
            </span>
            <span className="text-[10px] uppercase font-semibold text-primary tracking-wider flex items-center gap-1">
              Luyện Thi Chuẩn Quốc Tế <Sparkles className="h-2.5 w-2.5" />
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'px-3.5 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-primary font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher currentWorkspace={getCurrentWorkspaceType()} compact />

              <Link to={getWorkspacePath()}>
                <Button variant="primary" size="sm" className="gap-2 shadow-xs">
                  <span className="font-semibold truncate max-w-[140px]">{user?.displayName || 'Vào học'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Button variant="ghost" size="sm" onClick={logout} title="Đăng xuất" className="text-slate-500 hover:text-rose-600">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:text-primary font-semibold">
                  <LogIn className="h-4 w-4 mr-1.5" /> Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" className="font-semibold shadow-xs">
                  <UserPlus className="h-4 w-4 mr-1.5" /> Đăng ký miễn phí
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
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium',
                  location.pathname === link.path
                    ? 'bg-blue-50 text-primary font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{user?.displayName}</span>
                  <span className="text-slate-500">{user?.roles?.join(', ')}</span>
                </div>
                <Link to={getWorkspacePath()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    Vào Không Gian Học Tập
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full text-rose-600">
                  <LogOut className="h-4 w-4 mr-1.5" /> Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    <LogIn className="h-4 w-4 mr-1.5" /> Đăng nhập
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    <UserPlus className="h-4 w-4 mr-1.5" /> Đăng ký miễn phí
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
