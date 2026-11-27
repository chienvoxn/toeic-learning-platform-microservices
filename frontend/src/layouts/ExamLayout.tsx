import { useState, useRef, useCallback, useEffect } from 'react';
import { Outlet, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AutosaveStatus } from '@/features/exam/types';
import { LogOut } from 'lucide-react';

export interface ExamLayoutGuardState {
  hasUnsyncedChanges: boolean;
  autosaveStatus: AutosaveStatus;
  isSubmitting: boolean;
}

export interface ExamLayoutOutletContext {
  setSessionGuard: (guard: ExamLayoutGuardState) => void;
  registerBeforeExit: (cb: (() => void) | null) => void;
  closeExitConfirm: () => void;
}

export function useExamLayoutContext(): ExamLayoutOutletContext | null {
  return useOutletContext<ExamLayoutOutletContext | null>() ?? null;
}

export function ExamLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [guardState, setGuardState] = useState<ExamLayoutGuardState>({
    hasUnsyncedChanges: false,
    autosaveStatus: 'idle',
    isSubmitting: false,
  });

  const beforeExitCallbackRef = useRef<(() => void) | null>(null);

  const registerBeforeExit = useCallback((cb: (() => void) | null) => {
    beforeExitCallbackRef.current = cb;
  }, []);

  const closeExitConfirm = useCallback(() => {
    setIsExitConfirmOpen(false);
  }, []);

  // Automatically close exit confirmation modal when route or attempt path changes
  useEffect(() => {
    setIsExitConfirmOpen(false);
  }, [location.pathname]);

  const hasUnsyncedWarning =
    guardState.hasUnsyncedChanges ||
    guardState.autosaveStatus === 'saving' ||
    guardState.autosaveStatus === 'error';

  const handleRequestExit = () => {
    if (guardState.isSubmitting) return;
    setIsExitConfirmOpen(true);
  };

  const handleConfirmExit = () => {
    if (guardState.isSubmitting) return;
    setIsExitConfirmOpen(false);
    beforeExitCallbackRef.current?.();
    navigate('/learner/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Focused Editorial Exam Header */}
      <header className="h-16 border-b-[1.5px] border-border bg-surface px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <button
          type="button"
          onClick={handleRequestExit}
          disabled={guardState.isSubmitting}
          className="flex items-center gap-2.5 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <div className="h-9 w-9 rounded-sm bg-primary text-foreground border-[1.5px] border-border flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 5.5H20V9H13.75V19H10.25V9H4V5.5Z" fill="currentColor" />
              <rect x="16.5" y="13" width="3.5" height="6" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-foreground leading-tight tracking-tight">
                TOEIC Master
              </span>
              <Badge variant="outline" className="text-[10px] font-mono hidden sm:inline-flex">
                Phòng luyện thi
              </Badge>
            </div>
            <span className="text-[11px] font-medium text-ink-muted leading-tight">
              Không gian làm bài tập trung
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRequestExit}
            disabled={guardState.isSubmitting}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Rời phòng thi</span>
          </Button>
        </div>
      </header>

      {/* Main Focused Exam Canvas */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col">
        <Outlet
          context={
            {
              setSessionGuard: setGuardState,
              registerBeforeExit,
              closeExitConfirm,
            } satisfies ExamLayoutOutletContext
          }
        />
      </main>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
        variant={hasUnsyncedWarning ? 'destructive' : 'primary'}
        title={
          hasUnsyncedWarning
            ? 'Cảnh báo: Còn đáp án chưa đồng bộ!'
            : 'Tạm rời khỏi phòng luyện thi?'
        }
        description={
          hasUnsyncedWarning
            ? 'Một số đáp án bạn vừa chọn đang chờ lưu hoặc chưa đồng bộ thành công với máy chủ. Nếu rời phòng thi lúc này, các đáp án chưa đồng bộ sẽ bị mất.'
            : 'Lượt làm bài hiện ở trạng thái Đang làm (IN_PROGRESS). Các đáp án đã đồng bộ trên máy chủ được giữ lại để bạn tiếp tục sau.'
        }
        confirmText={hasUnsyncedWarning ? 'Vẫn rời phòng thi' : 'Rời phòng thi'}
        cancelText="Ở lại làm bài"
      />
    </div>
  );
}
