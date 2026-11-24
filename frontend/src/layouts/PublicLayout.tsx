import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthContext';
import { GraduationCap, LogIn, UserPlus, LogOut, Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicLayout() {
  const { isAuthenticated, user, hasRole, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getWorkspacePath = () => {
    if (hasRole('ADMIN')) return '/admin/dashboard';
    if (hasRole('TEACHER')) return '/teacher/dashboard';
    return '/learner/dashboard';
  };

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Kho Đề Thi', path: '/quizzes' },
    { label: 'Gói Hội Viên', path: '/pricing' },
    { label: 'Design System', path: '/preview' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Navigation */}
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
                EdTech SaaS <Sparkles className="h-2.5 w-2.5" />
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
                <Link to={getWorkspacePath()}>
                  <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-blue-50">
                    <span className="font-medium truncate max-w-[140px]">{user?.displayName || 'Vào học'}</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold uppercase">
                      {user?.role}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} title="Đăng xuất" className="text-slate-500 hover:text-rose-600">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4 mr-1.5" /> Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    <UserPlus className="h-4 w-4 mr-1.5" /> Bắt đầu ngay
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium',
                    location.pathname === link.path
                      ? 'bg-blue-50 text-primary font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link to={getWorkspacePath()} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-between">
                      <span>Vào không gian làm việc ({user?.displayName})</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full text-rose-600 justify-center" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      <LogIn className="h-4 w-4 mr-2" /> Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-center">
                      <UserPlus className="h-4 w-4 mr-2" /> Tạo tài khoản miễn phí
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Professional Footer */}
      <footer className="border-t border-slate-200 bg-white text-slate-600 text-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-bold text-base text-slate-900">TOEIC Master</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nền tảng luyện thi TOEIC chuẩn định dạng quốc tế. Kiến trúc Microservices phân tán hiệu năng cao.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <ShieldCheck className="h-4 w-4 shrink-0" /> Chuẩn hoá 5 Bounded Contexts
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Luyện Thi</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/quizzes" className="hover:text-primary">Kho Đề Thi Mới Nhất</Link></li>
                <li><Link to="/quizzes" className="hover:text-primary">Luyện Part 1 - 4 (Listening)</Link></li>
                <li><Link to="/quizzes" className="hover:text-primary">Luyện Part 5 - 7 (Reading)</Link></li>
                <li><Link to="/pricing" className="hover:text-primary">Hạng Hội Viên PRO</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Hệ Thống</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/preview" className="hover:text-primary">Design System & Token Preview</Link></li>
                <li><Link to="/login" className="hover:text-primary">Đăng nhập tài khoản</Link></li>
                <li><Link to="/register" className="hover:text-primary">Đăng ký học viên</Link></li>
                <li><span className="text-slate-400">Gateway API: :8088</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Công Nghệ & Cam Kết</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                100% dữ liệu đề thi và kết quả được xử lý từ cụm microservices thực tế, không sử dụng dữ liệu mô phỏng giả tạo.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">React 18</Badge>
                <Badge variant="outline" className="text-[10px]">TypeScript</Badge>
                <Badge variant="outline" className="text-[10px]">Tailwind CSS</Badge>
                <Badge variant="outline" className="text-[10px]">TanStack Query</Badge>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>© 2026 TOEIC Master Microservices. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/quizzes" className="hover:text-slate-600">Đề thi</Link>
              <Link to="/pricing" className="hover:text-slate-600">Gói cước</Link>
              <Link to="/preview" className="hover:text-slate-600">Thiết kế</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
