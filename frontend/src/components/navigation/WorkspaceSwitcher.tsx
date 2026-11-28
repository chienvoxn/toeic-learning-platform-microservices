import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Badge } from '@/components/atoms/Badge';
import {
  GraduationCap,
  BookOpenCheck,
  ShieldAlert,
  ChevronDown,
  Check,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkspaceType = 'learner' | 'teacher' | 'admin';

interface WorkspaceOption {
  id: WorkspaceType;
  title: string;
  badgeLabel: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roleRequired: string;
  badgeVariant: 'secondary' | 'pro' | 'outline' | 'destructive' | 'default';
  accentColor: string;
}

export const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  {
    id: 'learner',
    title: 'Không gian học viên',
    badgeLabel: 'LEARNER',
    description: 'Luyện đề, làm bài thi, xem lịch sử và tiến độ học tập',
    path: '/learner/dashboard',
    icon: GraduationCap,
    roleRequired: 'LEARNER',
    badgeVariant: 'default',
    accentColor: 'text-foreground bg-primary border-border',
  },
  {
    id: 'teacher',
    title: 'Không gian giảng viên',
    badgeLabel: 'TEACHER',
    description: 'Biên soạn đề thi, nhập CSV, duyệt và xuất bản câu hỏi',
    path: '/teacher/dashboard',
    icon: BookOpenCheck,
    roleRequired: 'TEACHER',
    badgeVariant: 'secondary',
    accentColor: 'text-foreground bg-secondary border-border',
  },
  {
    id: 'admin',
    title: 'Không gian quản trị',
    badgeLabel: 'ADMIN',
    description: 'Quản lý người dùng, phân quyền RBAC và kiểm duyệt toàn sàn',
    path: '/admin/dashboard',
    icon: ShieldAlert,
    roleRequired: 'ADMIN',
    badgeVariant: 'destructive',
    accentColor: 'text-foreground bg-destructive border-border',
  },
];

interface WorkspaceSwitcherProps {
  currentWorkspace: WorkspaceType;
  className?: string;
  onBeforeSwitch?: () => boolean | Promise<boolean>;
  compact?: boolean;
}

export function WorkspaceSwitcher({
  currentWorkspace,
  className,
  onBeforeSwitch,
  compact = false,
}: WorkspaceSwitcherProps) {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter workspaces by user's actual backend authorized roles
  // Learner is available to all logged-in accounts
  const authorizedWorkspaces = WORKSPACE_OPTIONS.filter((ws) => {
    if (ws.id === 'learner') return true;
    return hasRole(ws.roleRequired);
  });

  // Current active workspace details
  const currentOption = WORKSPACE_OPTIONS.find((ws) => ws.id === currentWorkspace) || WORKSPACE_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectWorkspace = async (target: WorkspaceOption) => {
    if (target.id === currentWorkspace) {
      setIsOpen(false);
      return;
    }

    // Check unsaved changes guard if provided
    if (onBeforeSwitch) {
      const canProceed = await onBeforeSwitch();
      if (!canProceed) {
        setIsOpen(false);
        return;
      }
    }

    // Remember preference in localStorage scoped per user
    try {
      const userKey = user?.userId ? `toeic_preferred_workspace_${user.userId}` : 'toeic_preferred_workspace';
      localStorage.setItem(userKey, target.id);
    } catch {
      // ignore storage access errors
    }

    setIsOpen(false);
    navigate(target.path);
  };

  // If user only has 1 role (only LEARNER), render a neat static workspace indicator
  if (authorizedWorkspaces.length <= 1) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-background border border-border text-xs font-bold text-foreground',
          className
        )}
      >
        <CurrentIcon className="h-4 w-4 text-foreground" />
        <span>{currentOption.title}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-colors border-[1.5px] select-none',
          'bg-surface hover:bg-muted text-foreground border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'h-9 px-2.5' : 'h-10'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Chuyển đổi không gian làm việc"
      >
        <div className="flex items-center gap-2 truncate">
          <div className={cn('p-1 rounded-sm shrink-0 border', currentOption.accentColor)}>
            <CurrentIcon className="h-3.5 w-3.5" />
          </div>
          {!compact && (
            <div className="flex flex-col text-left truncate">
              <span className="font-sans text-[10px] text-ink-muted uppercase font-bold leading-none">
                Không gian
              </span>
              <span className="text-xs font-bold text-foreground leading-tight truncate">{currentOption.title}</span>
            </div>
          )}
          {compact && (
            <span className="text-xs font-bold text-foreground">{currentOption.title}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-foreground">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 hidden sm:inline-flex">
            {authorizedWorkspaces.length} vai trò
          </Badge>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg bg-surface shadow-brutal-lg border-2 border-border p-2 z-50">
          <div className="px-2.5 py-2 border-b border-border/20 flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <ArrowRightLeft className="h-3 w-3 text-foreground" /> Chuyển không gian
            </span>
            <span className="font-mono text-[10px] font-bold text-ink-muted">
              {authorizedWorkspaces.length} khả dụng
            </span>
          </div>

          <div className="py-1.5 space-y-1">
            {authorizedWorkspaces.map((option) => {
              const Icon = option.icon;
              const isActive = option.id === currentWorkspace;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectWorkspace(option)}
                  className={cn(
                    'w-full flex items-start gap-2.5 p-2.5 rounded-md text-left transition-colors text-xs border',
                    isActive
                      ? 'bg-muted border-border font-bold text-foreground'
                      : 'border-transparent hover:bg-background text-foreground'
                  )}
                >
                  <div className={cn('p-1.5 rounded-sm shrink-0 mt-0.5 border', option.accentColor)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate text-foreground">{option.title}</span>
                      <Badge variant={option.badgeVariant} className="font-mono text-[9px] px-1 py-0 uppercase">
                        {option.badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-ink-muted font-normal leading-snug line-clamp-1 mt-0.5">
                      {option.description}
                    </p>
                  </div>

                  {isActive && <Check className="h-4 w-4 text-foreground shrink-0 self-center ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-border/20 px-2.5 py-1 text-[11px] text-ink-muted flex items-center justify-between">
            <span>Phiên đăng nhập giữ nguyên</span>
            <span className="font-mono font-bold text-foreground">JWT RBAC</span>
          </div>
        </div>
      )}
    </div>
  );
}
