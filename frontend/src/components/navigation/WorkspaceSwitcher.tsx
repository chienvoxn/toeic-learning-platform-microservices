import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  BookOpenCheck,
  ShieldAlert,
  ChevronDown,
  Check,
  Sparkles,
  ArrowRightLeft
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
    badgeVariant: 'secondary',
    accentColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'teacher',
    title: 'Không gian giảng viên',
    badgeLabel: 'TEACHER',
    description: 'Biên soạn đề thi, nhập CSV, duyệt và xuất bản câu hỏi',
    path: '/teacher/dashboard',
    icon: BookOpenCheck,
    roleRequired: 'TEACHER',
    badgeVariant: 'default',
    accentColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
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
    accentColor: 'text-rose-600 bg-rose-50 border-rose-200',
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
      <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700', className)}>
        <CurrentIcon className="h-4 w-4 text-primary" />
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
          'inline-flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs select-none',
          'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20',
          compact ? 'h-9 px-2.5' : 'h-10'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Chuyển đổi không gian làm việc"
      >
        <div className="flex items-center gap-2 truncate">
          <div className={cn('p-1 rounded-md shrink-0 border', currentOption.accentColor)}>
            <CurrentIcon className="h-3.5 w-3.5" />
          </div>
          {!compact && (
            <div className="flex flex-col text-left truncate">
              <span className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Không gian</span>
              <span className="text-xs font-bold text-slate-800 leading-tight truncate">{currentOption.title}</span>
            </div>
          )}
          {compact && (
            <span className="text-xs font-bold text-slate-800">{currentOption.title}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold uppercase hidden sm:inline-flex">
            {authorizedWorkspaces.length} vai trò
          </Badge>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowRightLeft className="h-3 w-3 text-primary" /> Chuyển không gian làm việc
            </span>
            <span className="text-[10px] text-slate-400">{authorizedWorkspaces.length} khả dụng</span>
          </div>

          <div className="py-1 space-y-1">
            {authorizedWorkspaces.map((option) => {
              const Icon = option.icon;
              const isActive = option.id === currentWorkspace;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectWorkspace(option)}
                  className={cn(
                    'w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors text-xs',
                    isActive
                      ? 'bg-blue-50/80 text-primary font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5 border', option.accentColor)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate text-slate-900">{option.title}</span>
                      <Badge variant={option.badgeVariant} className="text-[9px] px-1 py-0 uppercase">
                        {option.badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal leading-snug line-clamp-1 mt-0.5">
                      {option.description}
                    </p>
                  </div>

                  {isActive && (
                    <Check className="h-4 w-4 text-primary shrink-0 self-center ml-1" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-slate-100 px-3 py-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Phiên đăng nhập: Giữ nguyên</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Xác thực JWT
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
