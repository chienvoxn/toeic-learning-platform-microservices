import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon, LogOut, X } from 'lucide-react';
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
      brandIconBg: 'bg-primary text-foreground border-[1.5px] border-border',
      brandSubtitle: 'text-ink-muted',
      activeNav: 'bg-background text-foreground font-extrabold border-[1.5px] border-border shadow-subtle',
      activeIcon: 'text-foreground',
    },
    teacher: {
      brandIconBg: 'bg-secondary text-foreground border-[1.5px] border-border',
      brandSubtitle: 'text-ink-muted',
      activeNav: 'bg-secondary/45 text-foreground font-extrabold border-[1.5px] border-border shadow-subtle',
      activeIcon: 'text-foreground',
    },
    admin: {
      brandIconBg: 'bg-ink text-surface border-[1.5px] border-border',
      brandSubtitle: 'text-ink-muted',
      activeNav: 'bg-warning/50 text-foreground font-extrabold border-[1.5px] border-border shadow-subtle',
      activeIcon: 'text-foreground',
    },
  };

  const style = roleStyles[workspaceRole];

  const renderSidebar = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-surface text-foreground">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b-[1.5px] border-border">
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <div className={cn('h-9 w-9 rounded-sm flex items-center justify-center shrink-0', style.brandIconBg)}>
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 5.5H20V9H13.75V19H10.25V9H4V5.5Z" fill="currentColor" />
              <rect x="16.5" y="13" width="3.5" height="6" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-foreground leading-tight tracking-tight">{brandTitle}</span>
            <span className={cn('font-sans text-[11px] font-bold uppercase tracking-wider', style.brandSubtitle)}>
              {brandSubtitle}
            </span>
          </div>
        </Link>

        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-sm border border-border bg-surface text-foreground hover:bg-muted transition-colors"
            aria-label="Đóng menu điều hướng"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User Card Slot (if any) */}
      {userCard && <div className="border-b border-border/20">{userCard}</div>}

      {/* Quick Switch Slot */}
      {quickSwitchBanner}

      {/* Nav Items List */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto" aria-label="Điều hướng không gian làm việc">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path ||
            (item.path !== `/${workspaceRole}/dashboard` && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={isMobile ? onCloseMobile : undefined}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? style.activeNav
                  : 'border border-transparent font-semibold text-ink-muted hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4 shrink-0', active ? style.activeIcon : 'text-ink-muted')} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm border border-border bg-muted text-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Action */}
      {onLogout && (
        <div className="p-4 border-t border-border/20 bg-background/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-foreground hover:bg-destructive/30 text-xs font-bold"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 border-r-[1.5px] border-border flex-col shrink-0 sticky top-0 h-screen z-30">
        {renderSidebar(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-ink/60 transition-opacity motion-reduce:transition-none"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full border-r-2 border-border shadow-brutal-lg z-10">
            {renderSidebar(true)}
          </div>
        </div>
      )}
    </>
  );
}
