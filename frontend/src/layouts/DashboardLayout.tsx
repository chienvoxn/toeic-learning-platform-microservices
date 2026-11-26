import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar, NavItem } from '@/components/organisms/DashboardSidebar';
import { DashboardHeader } from '@/components/organisms/DashboardHeader';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  workspaceRole: 'learner' | 'teacher' | 'admin';
  brandSubtitle: string;
  headerTitle: string;
  headerBadge?: string;
  navItems: NavItem[];
  quickSwitchBanner?: React.ReactNode;
  userCard?: React.ReactNode;
  headerActions?: React.ReactNode;
  onLogout?: () => void;
  className?: string;
  mainClassName?: string;
  children?: React.ReactNode;
}

export function DashboardLayout({
  workspaceRole,
  brandSubtitle,
  headerTitle,
  headerBadge,
  navItems,
  quickSwitchBanner,
  userCard,
  headerActions,
  onLogout,
  className,
  mainClassName,
  children,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={cn('min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]', className)}>
      {/* Composed Sidebar with Desktop sticky & Mobile drawer */}
      <DashboardSidebar
        workspaceRole={workspaceRole}
        brandSubtitle={brandSubtitle}
        navItems={navItems}
        quickSwitchBanner={quickSwitchBanner}
        userCard={userCard}
        onLogout={onLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Composed Header */}
        <DashboardHeader
          title={headerTitle}
          badgeText={headerBadge}
          currentWorkspace={workspaceRole}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
          actions={headerActions}
        />

        {/* Viewport Content */}
        <main className={cn('flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto', mainClassName)}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
