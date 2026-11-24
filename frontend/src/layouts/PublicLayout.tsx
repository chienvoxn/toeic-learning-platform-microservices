import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthContext';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';
import {
  GraduationCap,
  LogIn,
  UserPlus,
  LogOut,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Headphones,
  BookOpen
} from 'lucide-react';
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
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
              <WorkspaceSwitcher currentWorkspace={getCurrentWorkspaceType()} compact />
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3 animate-in fade-in">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3.5 py-2.5 rounded-lg text-sm font-medium',
                    location.pathname === link.path
                      ? 'bg-blue-50 text-primary font-bold'
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
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-slate-500 truncate">{user?.displayName || user?.email}</span>
                  </div>
                  <Link to={getWorkspacePath()} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-center">
                      Vào bàn làm việc <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-center text-rose-600" onClick={logout}>
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

      {/* Professional Educational Footer */}
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
                Nền tảng luyện thi TOEIC Listening & Reading trực tuyến chuẩn format quốc tế. Tự động chấm điểm, lưu trữ tiến độ và phản hồi chi tiết.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <ShieldCheck className="h-4 w-4 shrink-0" /> Hệ thống chuẩn hóa 7 Parts
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Khám Phá Kỹ Năng</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/quizzes?skill=listening" className="hover:text-primary flex items-center gap-1.5"><Headphones className="h-3 w-3 text-primary" /> TOEIC Listening (Part 1 - 4)</Link></li>
                <li><Link to="/quizzes?skill=reading" className="hover:text-primary flex items-center gap-1.5"><BookOpen className="h-3 w-3 text-indigo-600" /> TOEIC Reading (Part 5 - 7)</Link></li>
                <li><Link to="/quizzes" className="hover:text-primary">Toàn Bộ Kho Đề Thi</Link></li>
                <li><Link to="/pricing" className="hover:text-primary">Gói Hội Viên PRO</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Không Gian Học Tập</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/learner/dashboard" className="hover:text-primary">Không Gian Học Viên</Link></li>
                <li><Link to="/teacher/dashboard" className="hover:text-primary">Không Gian Giảng Viên</Link></li>
                <li><Link to="/admin/dashboard" className="hover:text-primary">Không Gian Quản Trị</Link></li>
                <li><Link to="/login" className="hover:text-primary">Đăng Nhập Tài Khoản</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Cam Kết Giáo Dục</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                100% câu hỏi và dữ liệu luyện thi được đồng bộ trực tiếp từ hệ sinh thái học tập TOEIC Master, đảm bảo tính công bằng và minh bạch trong kết quả bài thi.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">Định Dạng Chuẩn Quốc Tế</Badge>
                <Badge variant="outline" className="text-[10px]">Chấm Điểm Tức Thì</Badge>
                <Badge variant="outline" className="text-[10px]">Giải Thích Chi Tiết</Badge>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>© 2026 TOEIC Master. Nền tảng học và luyện thi TOEIC trực tuyến.</p>
            <div className="flex gap-4">
              <Link to="/quizzes" className="hover:text-slate-600">Kho đề thi</Link>
              <Link to="/pricing" className="hover:text-slate-600">Gói cước hội viên</Link>
              <Link to="/login" className="hover:text-slate-600">Đăng nhập</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
