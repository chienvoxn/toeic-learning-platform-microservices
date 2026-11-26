import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon, GraduationCap, LogOut, X } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

export interface DashboardSidebarProps {
  workspaceRole: 'learner' | 'teacher' | 'admin';
  brandTitle?: string;
  brandSubtitle: string;
  navItems: NavItem[];
  quickSwitchBanner?: React.ReactNode;
  userCard?: React.ReactNode;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function DashboardSidebar({
  workspaceRole,
  brandTitle = 'TOEIC Master',
  brandSubtitle,
  navItems,
  quickSwitchBanner,
  userCard,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}: DashboardSidebarProps) {
  const location = useLocation();

  const roleStyles = {
    learner: {
      brandIconBg: 'bg-primary',
      brandSubtitle: 'text-primary',
      activeNav: 'bg-blue-50 text-primary font-bold shadow-xs',
      activeIcon: 'text-primary',
    },
    teacher: {
      brandIconBg: 'bg-blue-600',
      brandSubtitle: 'text-blue-600',
      activeNav: 'bg-blue-50 text-blue-700 font-bold shadow-xs',
      activeIcon: 'text-blue-600',
    },
    admin: {
      brandIconBg: 'bg-slate-900',
      brandSubtitle: 'text-rose-600',
      activeNav: 'bg-rose-50 text-rose-700 font-bold shadow-xs',
      activeIcon: 'text-rose-600',
    },
  };

  const style = roleStyles[workspaceRole];

  const renderSidebar = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-white">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
        <Link to="/" className="flex items-center gap-2.5">
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-xs', style.brandIconBg)}>
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 leading-tight">{brandTitle}</span>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', style.brandSubtitle)}>{brandSubtitle}</span>
          </div>
        </Link>

        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Đóng menu điều hướng"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User Card Slot (if any) */}
      {userCard && <div className="border-b border-slate-100">{userCard}</div>}

      {/* Quick Switch Slot */}
      {quickSwitchBanner}

      {/* Nav Items List */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || (item.path !== `/${workspaceRole}/dashboard` && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={isMobile ? onCloseMobile : undefined}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active ? style.activeNav : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4 shrink-0', active ? style.activeIcon : 'text-slate-400')} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Action */}
      {onLogout && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold"
          >
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 flex-col shrink-0 sticky top-0 h-screen z-30">
        {renderSidebar(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebar(true)}
          </div>
        </div>
      )}
    </>
  );
}
