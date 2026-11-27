import React from 'react';
import { Menu } from 'lucide-react';
import { Badge } from '@/components/atoms/Badge';
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher';

export interface DashboardHeaderProps {
  title: string;
  badgeText?: string;
  currentWorkspace: 'learner' | 'teacher' | 'admin';
  onOpenMobile?: () => void;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  badgeText,
  currentWorkspace,
  onOpenMobile,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b-[1.5px] border-border bg-surface text-foreground px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobile && (
          <button
            type="button"
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-sm border border-border bg-surface text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold text-foreground truncate max-w-[200px] sm:max-w-md tracking-tight">
            {title}
          </h1>
          {badgeText && (
            <Badge variant="secondary" className="hidden sm:inline-flex font-mono text-[11px]">
              {badgeText}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <WorkspaceSwitcher currentWorkspace={currentWorkspace} />
        {actions}
      </div>
    </header>
  );
}
