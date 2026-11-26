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
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button
            type="button"
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
            {title}
          </h1>
          {badgeText && (
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-normal text-slate-600 border-slate-200 bg-slate-50">
              {badgeText}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <WorkspaceSwitcher currentWorkspace={currentWorkspace} />
        {actions}
      </div>
    </header>
  );
}
