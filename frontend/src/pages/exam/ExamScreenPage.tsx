import { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import {
  useParams,
  useNavigate,
  Link,
  useBlocker,
  UNSAFE_DataRouterStateContext,
} from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { formatPartName } from '@/lib/utils';
import { AttemptView } from '@/types/attempt';
import { QuizDetail } from '@/types/quiz';
import { useAuth } from '@/features/auth/AuthContext';
import { useExamLayoutContext } from '@/layouts/ExamLayout';
import { QuestionCanvas } from '@/features/exam/QuestionCanvas';
import { QuestionPalette } from '@/features/exam/QuestionPalette';
import { SubmitConfirmDialog } from '@/features/exam/SubmitConfirmDialog';
import { AutosaveIndicator } from '@/features/exam/AutosaveIndicator';
import { useExamAutosave, isValidQuestionChoice } from '@/features/exam/useExamAutosave';
import { useExamTimer } from '@/features/exam/useExamTimer';
import { useExamKeyboardShortcuts } from '@/features/exam/useExamKeyboardShortcuts';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { Alert } from '@/components/molecules/Alert';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import {
  Clock,
  ArrowLeft,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  FileQuestion,
  Send,
} from 'lucide-react';

function formatSubmitError(err: unknown): string {
  if (err instanceof Error) {
    const cleanMsg = err.message.trim();
    const lower = cleanMsg.toLowerCase();
    if (cleanMsg.startsWith('<') || lower.includes('<html') || lower.includes('<!doctype')) {
      return 'Máy chủ trả về phản hồi không hợp lệ khi nộp bài. Vui lòng thử lại.';
    }
    if (lower.includes('failed to fetch') || lower.includes('network')) {
      return 'Không thể kết nối máy chủ để nộp bài. Dữ liệu bài làm vẫn được giữ nguyên trên màn hình.';
    }
    return cleanMsg || 'Nộp bài thất bại. Vui lòng thử lại.';
  }
  return 'Nộp bài thất bại. Vui lòng thử lại.';
}

function DataRouterNavigationBlocker({
  shouldBlock,
  onBlocked,
  onReset,
}: {
  shouldBlock: () => boolean;
  onBlocked?: () => void;
  onReset?: () => void;
}) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock() && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      onBlocked?.();
    }
  }, [blocker.state, onBlocked]);

  return (
    <ConfirmDialog
      isOpen={blocker.state === 'blocked'}
      onClose={() => {
        onReset?.();
        blocker.reset?.();
      }}
      onConfirm={() => blocker.proceed?.()}
      variant="destructive"
      title="Cảnh báo: Còn đáp án chưa đồng bộ!"
      description="Một số đáp án bạn vừa chọn đang chờ lưu hoặc chưa đồng bộ thành công với máy chủ. Nếu rời khỏi trang lúc này, các đáp án chưa đồng bộ sẽ bị mất."
      confirmText="Vẫn rời trang"
      cancelText="Ở lại làm bài"
    />
  );
}

export function ExamScreenPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const layoutContext = useExamLayoutContext();
  const hasDataRouter = Boolean(useContext(UNSAFE_DataRouterStateContext));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackendGradedLocked, setIsBackendGradedLocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusAlertMessage, setStatusAlertMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const hydratedAttemptIdRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const isBackendGradedLockedRef = useRef(false);
  const isExitBypassRef = useRef(false);
  const activeAttemptIdRef = useRef<string | undefined>(attemptId);
  const verifyPromiseRef = useRef<Promise<'GRADED' | 'IN_PROGRESS' | 'ERROR'> | null>(null);
  const onAutosaveConflictRef = useRef<(conflictAttemptId: string) => void>(() => {});

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Fetch Attempt Data
  const {
    data: attempt,
    isLoading: isAttemptLoading,
    isError: isAttemptError,
    error: attemptError,
    refetch: refetchAttempt,
  } = useQuery<AttemptView>({
    queryKey: ['attempt', attemptId],
    queryFn: () => apiRequest<AttemptView>(`/ms/v1/attempts/${attemptId}`),
    enabled: Boolean(attemptId),
    retry: 1,
    staleTime: 0,
  });

  // 2. Fetch Quiz Metadata using actual QuizDetail DTO contract
  const { data: quizDetail } = useQuery<QuizDetail>({
    queryKey: ['quiz-detail', attempt?.quizId],
    queryFn: () => apiRequest<QuizDetail>(`/ms/v1/contents/quizzes/${attempt?.quizId}`),
    enabled: Boolean(attempt?.quizId),
    staleTime: 1000 * 60 * 5,
  });

  const quiz = quizDetail?.quiz;
  const questions = useMemo(() => attempt?.questions || [], [attempt?.questions]);
  const totalQuestions = questions.length;

  // Reset editor session state when navigating to another attemptId
  useEffect(() => {
    activeAttemptIdRef.current = attemptId;
    hydratedAttemptIdRef.current = null;
    isSubmittingRef.current = false;
    isBackendGradedLockedRef.current = false;
    isExitBypassRef.current = false;
    verifyPromiseRef.current = null;
    setCurrentIndex(0);
    setSelectedAnswers({});
    setBookmarks(new Set());
    setIsConfirmOpen(false);
    setIsSubmitting(false);
    setIsBackendGradedLocked(false);
    setSubmitError(null);
    setStatusAlertMessage(null);
  }, [attemptId]);

  // 3. Setup Autosave (EX-01 + H1 conflict recovery hook)
  const {
    status: autosaveStatus,
    hasPendingChanges,
    lastSavedAt,
    errorMessage: autosaveError,
    queueAnswer,
    syncPending,
    retry: retryAutosave,
    stopAutosaveForGraded,
  } = useExamAutosave(attemptId || '', questions, {
    loadedAttemptId: attempt?.id,
    onConflict: (conflictAttemptId) => {
      onAutosaveConflictRef.current(conflictAttemptId);
    },
  });

  // Verify authoritative backend state after HTTP 409 conflict or uncertain POST /submit
  const verifyAttemptStateFromServer = useCallback(
    async (
      targetAttemptId: string,
      source: 'autosave_conflict' | 'submit_uncertain'
    ): Promise<'GRADED' | 'IN_PROGRESS' | 'ERROR'> => {
      if (!targetAttemptId) return 'ERROR';
      if (verifyPromiseRef.current) {
        return verifyPromiseRef.current;
      }

      let verifyPromise: Promise<'GRADED' | 'IN_PROGRESS' | 'ERROR'> | null = null;
      verifyPromise = (async (): Promise<'GRADED' | 'IN_PROGRESS' | 'ERROR'> => {
        try {
          const fresh = await apiRequest<AttemptView>(`/ms/v1/attempts/${targetAttemptId}`);
          if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
            return 'ERROR';
          }

          if (fresh.status === 'GRADED') {
            stopAutosaveForGraded();
            isBackendGradedLockedRef.current = true;
            setIsBackendGradedLocked(true);
            setIsConfirmOpen(false);
            setSubmitError(null);
            setStatusAlertMessage(null);
            queryClient.setQueryData(['attempt', targetAttemptId], fresh);
            queryClient.invalidateQueries({ queryKey: ['attempt-result', fresh.id] });
            queryClient.invalidateQueries({ queryKey: ['learner-attempts'] });
            queryClient.invalidateQueries({ queryKey: ['learner-activities'] });
            isExitBypassRef.current = true;
            navigate(`/learner/results/${fresh.id}`, { replace: true });
            return 'GRADED';
          }

          setStatusAlertMessage(
            source === 'autosave_conflict'
              ? 'Máy chủ báo xung đột (HTTP 409) nhưng lượt thi vẫn đang Đang làm. Các đáp án chưa lưu vẫn được giữ trên màn hình để bạn thử đồng bộ lại.'
              : 'Lượt thi vẫn đang ở trạng thái Đang làm trên máy chủ. Bạn có thể kiểm tra lại kết nối và thử nộp lại.'
          );
          return 'IN_PROGRESS';
        } catch {
          if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
            return 'ERROR';
          }
          setStatusAlertMessage(
            'Không thể xác minh trạng thái lượt thi từ máy chủ do lỗi kết nối. Dữ liệu bài làm vẫn được giữ nguyên trên màn hình để bạn kiểm tra lại.'
          );
          return 'ERROR';
        } finally {
          if (verifyPromiseRef.current === verifyPromise) {
            verifyPromiseRef.current = null;
          }
        }
      })();

      verifyPromiseRef.current = verifyPromise;
      return verifyPromise;
    },
    [navigate, queryClient, stopAutosaveForGraded]
  );

  onAutosaveConflictRef.current = (conflictAttemptId: string) => {
    void verifyAttemptStateFromServer(conflictAttemptId, 'autosave_conflict');
  };

  // 4. Setup Practice Timer (EX-03 + L1 isTimeUp)
  const {
    formattedRemaining,
    isWarning: isTimerWarning,
    isTimeUp,
  } = useExamTimer(totalQuestions, undefined, attempt?.id);

  // 5. Initial hydration & GRADED redirect (EX-01 + M1)
  useEffect(() => {
    if (!attempt || !attemptId || attempt.id !== attemptId) return;

    if (attempt.status === 'GRADED') {
      stopAutosaveForGraded();
      isBackendGradedLockedRef.current = true;
      setIsBackendGradedLocked(true);
      isExitBypassRef.current = true;
      navigate(`/learner/results/${attempt.id}`, { replace: true });
      return;
    }

    if (hydratedAttemptIdRef.current !== attempt.id) {
      hydratedAttemptIdRef.current = attempt.id;
      const restored: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
      attempt.questions.forEach((q) => {
        if (isValidQuestionChoice(q, q.selectedChoice)) {
          restored[q.id] = q.selectedChoice;
        }
      });
      setSelectedAnswers(restored);
    }
  }, [attempt, attemptId, navigate, stopAutosaveForGraded]);

  const hasUnsyncedChanges =
    hasPendingChanges || autosaveStatus === 'saving' || autosaveStatus === 'error';

  const isAttemptInProgress =
    attempt?.status === 'IN_PROGRESS' && !isBackendGradedLocked;

  // Sync guard state & bypass callback to ExamLayout header exit button (EX-07 + L1)
  const setSessionGuard = layoutContext?.setSessionGuard;
  const registerBeforeExit = layoutContext?.registerBeforeExit;
  const closeExitConfirm = layoutContext?.closeExitConfirm;

  useEffect(() => {
    if (!setSessionGuard) return;
    setSessionGuard({
      hasUnsyncedChanges: Boolean(isAttemptInProgress && hasUnsyncedChanges),
      autosaveStatus,
      isSubmitting,
    });
  }, [setSessionGuard, isAttemptInProgress, hasUnsyncedChanges, autosaveStatus, isSubmitting]);

  useEffect(() => {
    if (!registerBeforeExit) return;
    registerBeforeExit(() => {
      isExitBypassRef.current = true;
      window.setTimeout(() => {
        if (isMountedRef.current) {
          isExitBypassRef.current = false;
        }
      }, 0);
    });
    return () => {
      registerBeforeExit(null);
      setSessionGuard?.({
        hasUnsyncedChanges: false,
        autosaveStatus: 'idle',
        isSubmitting: false,
      });
    };
  }, [registerBeforeExit, setSessionGuard]);

  // Browser close / refresh warning when unsynced answers exist (EX-07)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsyncedChanges && !isSubmitting && isAttemptInProgress) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsyncedChanges, isSubmitting, isAttemptInProgress]);

  const shouldBlockNavigationRef = useRef(false);
  shouldBlockNavigationRef.current = Boolean(
    hasUnsyncedChanges &&
      !isSubmitting &&
      !isExitBypassRef.current &&
      isAttemptInProgress &&
      isAuthenticated
  );

  const checkShouldBlockNavigation = useCallback(() => {
    return shouldBlockNavigationRef.current;
  }, []);

  const handleBlockerOpened = useCallback(() => {
    closeExitConfirm?.();
  }, [closeExitConfirm]);

  const handleBlockerReset = useCallback(() => {
    isExitBypassRef.current = false;
  }, []);

  // Choice selection with Invalid Choice, GRADED Lock & Submission guards (EX-02 + H1)
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B' | 'C' | 'D') => {
      if (
        !attempt ||
        attempt.status !== 'IN_PROGRESS' ||
        isBackendGradedLockedRef.current ||
        isSubmittingRef.current ||
        isSubmitting
      ) {
        return;
      }
      const currentQuestion = questions[currentIndex];
      if (!isValidQuestionChoice(currentQuestion, choice)) {
        return;
      }

      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: choice,
      }));

      queueAnswer(currentQuestion.id, choice);
    },
    [attempt, isSubmitting, questions, currentIndex, queueAnswer]
  );

  // Bookmark toggle (guarded while submitting or GRADED)
  const handleToggleBookmark = useCallback(() => {
    if (
      !attempt ||
      attempt.status !== 'IN_PROGRESS' ||
      isBackendGradedLockedRef.current ||
      isSubmittingRef.current ||
      isSubmitting
    ) {
      return;
    }
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  }, [attempt, isSubmitting, questions, currentIndex]);

  // Question navigation handlers
  const handleNext = useCallback(() => {
    if (isSubmittingRef.current || isSubmitting || isBackendGradedLockedRef.current) return;
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isSubmitting, currentIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (isSubmittingRef.current || isSubmitting || isBackendGradedLockedRef.current) return;
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [isSubmitting, currentIndex]);

  const handleJumpToQuestion = useCallback(
    (idx: number) => {
      if (isSubmittingRef.current || isSubmitting || isBackendGradedLockedRef.current) return;
      if (idx >= 0 && idx < totalQuestions) {
        setCurrentIndex(idx);
      }
    },
    [isSubmitting, totalQuestions]
  );

  // Keyboard shortcuts (EX-05 + M2)
  useExamKeyboardShortcuts({
    onSelectChoice: handleSelectChoice,
    onNext: handleNext,
    onPrev: handlePrev,
    onToggleBookmark: handleToggleBookmark,
    enabled:
      !isConfirmOpen &&
      !isSubmitting &&
      !isBackendGradedLocked &&
      attempt?.status === 'IN_PROGRESS',
  });

  // Safe Submit Handler (EX-06 + H1 + M1)
  const handleConfirmSubmit = async () => {
    const targetAttemptId = attemptId;
    if (
      !targetAttemptId ||
      isSubmittingRef.current ||
      isSubmitting ||
      isBackendGradedLockedRef.current ||
      !attempt ||
      attempt.status !== 'IN_PROGRESS'
    ) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Sync pending answers sequentially
      const syncOk = await syncPending();
      if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
        return;
      }

      // 2. Confirm full sync before POST /submit (or verify GRADED state on conflict)
      if (!syncOk) {
        if (isBackendGradedLockedRef.current) {
          return;
        }
        const verified = await verifyAttemptStateFromServer(targetAttemptId, 'submit_uncertain');
        if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
          return;
        }
        if (verified === 'GRADED') {
          return;
        }
        throw new Error(
          verified === 'ERROR'
            ? 'Không thể đồng bộ đáp án và chưa xác minh được trạng thái bài thi trên máy chủ. Dữ liệu bài làm vẫn được giữ nguyên trên màn hình.'
            : 'Chưa đồng bộ xong đáp án lên máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
        );
      }

      // 3. Submit attempt for idempotent server-side grading
      const graded = await apiRequest<AttemptView>(`/ms/v1/attempts/${targetAttemptId}/submit`, {
        method: 'POST',
      });

      if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
        return;
      }

      // 4. Invalidate attempt & dashboard caches
      stopAutosaveForGraded();
      isBackendGradedLockedRef.current = true;
      setIsBackendGradedLocked(true);
      queryClient.setQueryData(['attempt', targetAttemptId], graded);
      queryClient.invalidateQueries({ queryKey: ['attempt-result', graded.id] });
      queryClient.invalidateQueries({ queryKey: ['learner-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['learner-activities'] });

      // 5. Redirect cleanly without triggering exit blocker
      isExitBypassRef.current = true;
      navigate(`/learner/results/${graded.id}`, { replace: true });
    } catch (err: unknown) {
      if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
        return;
      }
      if (isBackendGradedLockedRef.current) {
        return;
      }

      // Recover gracefully if POST /submit actually succeeded on backend before connection dropped
      const verified = await verifyAttemptStateFromServer(targetAttemptId, 'submit_uncertain');
      if (!isMountedRef.current || activeAttemptIdRef.current !== targetAttemptId) {
        return;
      }
      if (verified === 'GRADED') {
        return;
      }

      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmitError(formatSubmitError(err));
    }
  };

  // Loading State
  if (isAttemptLoading) {
    return (
      <div className="space-y-5 py-4">
        <SkeletonLoader className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 xl:col-span-9">
            <SkeletonLoader className="h-[480px] w-full rounded-lg" />
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <SkeletonLoader className="h-[480px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (isAttemptError || !attempt) {
    const errorMsg =
      attemptError instanceof Error ? attemptError.message : 'Không tìm thấy lượt làm bài yêu cầu.';
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card variant="flat" className="p-6 sm:p-8 border-[1.5px] border-border shadow-brutal-sm space-y-5 text-center">
          <div className="h-14 w-14 rounded-md bg-destructive/40 border-[1.5px] border-border text-foreground flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-foreground">Không thể mở phòng luyện thi</h1>
            <p className="text-sm text-ink-muted leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button type="button" variant="outline" size="md" onClick={() => refetchAttempt()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Thử tải lại</span>
            </Button>
            <Link to="/learner/history">
              <Button type="button" variant="primary" size="md">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Về lịch sử luyện thi</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Already Graded Non-Interactive Safeguard
  if (attempt.status === 'GRADED' || isBackendGradedLocked) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card variant="flat" className="p-6 sm:p-8 border-[1.5px] border-border shadow-brutal-sm space-y-4 text-center">
          <div className="h-12 w-12 rounded-md bg-success/40 border-[1.5px] border-border text-foreground flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-extrabold text-foreground">Bài thi đã được chấm điểm</h1>
          <p className="text-sm text-ink-muted">
            Lượt thi này đã hoàn tất và khóa chỉnh sửa. Đang chuyển hướng sang trang kết quả chi tiết...
          </p>
          <div className="pt-2">
            <Link to={`/learner/results/${attempt.id}`}>
              <Button type="button" variant="primary" size="md">
                Xem kết quả bài thi
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const validQuestionIds = new Set(questions.map((q) => q.id));
  const answeredCount = Object.keys(selectedAnswers).filter((qId) =>
    validQuestionIds.has(qId)
  ).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const validBookmarkedCount = questions.filter((q) => bookmarks.has(q.id)).length;

  return (
    <div className="flex-1 flex flex-col space-y-5">
      {hasDataRouter && (
        <DataRouterNavigationBlocker
          shouldBlock={checkShouldBlockNavigation}
          onBlocked={handleBlockerOpened}
          onReset={handleBlockerReset}
        />
      )}

      {/* Exam Command & Status Header */}
      <Card variant="flat" className="p-4 sm:p-5 border-[1.5px] border-border bg-surface shadow-brutal-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {quiz && (
                <Badge variant="default" className="text-[11px] font-extrabold">
                  {formatPartName(quiz.part)}
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-[11px]">
                Lượt thi #{attempt.id.slice(0, 8)}
              </Badge>
              <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate max-w-2xl">
                {quiz ? quiz.title : 'Bài luyện thi TOEIC'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AutosaveIndicator
                status={autosaveStatus}
                hasPendingChanges={hasPendingChanges}
                lastSavedAt={lastSavedAt}
                errorMessage={autosaveError}
                onRetry={retryAutosave}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Estimated Practice Timer (clearly labeled non-blocking, L1 isTimeUp message) */}
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-md border-[1.5px] border-border ${
                isTimeUp
                  ? 'bg-warning/45'
                  : isTimerWarning
                  ? 'bg-destructive/35'
                  : 'bg-background'
              }`}
              title="Thời gian luyện tập ước tính (tham khảo, hệ thống không tự động nộp hoặc khóa bài)"
            >
              <Clock className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Thời gian tham khảo
                </span>
                <span className="font-mono tabular-nums font-extrabold text-sm text-foreground">
                  {formattedRemaining}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                if (!isSubmitting && !isBackendGradedLockedRef.current) {
                  setIsConfirmOpen(true);
                }
              }}
              disabled={isSubmitting || isBackendGradedLocked || totalQuestions === 0}
              className="hidden sm:inline-flex"
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{isSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}</span>
            </Button>
          </div>
        </div>

        {isTimeUp && (
          <div className="mt-3 pt-3 border-t border-border/40 text-xs font-bold text-foreground">
            Hết giờ tham khảo — Bạn vẫn có thể tiếp tục làm bài.
          </div>
        )}
      </Card>

      {statusAlertMessage && (
        <Alert type="warning" title="Trạng thái đồng bộ lượt thi">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>{statusAlertMessage}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (attemptId) {
                  void verifyAttemptStateFromServer(attemptId, 'submit_uncertain');
                }
              }}
              className="shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kiểm tra lại trạng thái</span>
            </Button>
          </div>
        </Alert>
      )}

      {autosaveStatus === 'error' && (
        <Alert type="error" title="Chưa đồng bộ được một số đáp án lên máy chủ">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              {autosaveError ||
                'Kết nối không ổn định. Các đáp án vẫn được giữ tạm trên màn hình trong phiên làm bài.'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void retryAutosave();
              }}
              className="shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Thử đồng bộ lại</span>
            </Button>
          </div>
        </Alert>
      )}

      {/* Main 2-Column Examination Viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Question Canvas (70–75% on desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
          {currentQuestion ? (
            <QuestionCanvas
              question={currentQuestion}
              currentIndex={currentIndex}
              totalQuestions={totalQuestions}
              selectedChoice={selectedAnswers[currentQuestion.id] || null}
              isBookmarked={bookmarks.has(currentQuestion.id)}
              onSelectChoice={handleSelectChoice}
              onToggleBookmark={handleToggleBookmark}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < totalQuestions - 1}
              disabled={isSubmitting || isConfirmOpen || isBackendGradedLocked}
            />
          ) : (
            <EmptyState
              icon={FileQuestion}
              title="Đề thi chưa có câu hỏi nào"
              description="Không tìm thấy câu hỏi khả dụng cho lượt làm bài này. Vui lòng quay lại lịch sử luyện thi."
              actionText="Về lịch sử luyện thi"
              onAction={() => navigate('/learner/history')}
            />
          )}
        </div>

        {/* Question Palette (25–30% on desktop, sticky) */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20">
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            selectedAnswers={selectedAnswers}
            bookmarks={bookmarks}
            onSelectQuestion={handleJumpToQuestion}
            onSubmitClick={() => {
              if (!isSubmitting && !isBackendGradedLockedRef.current) {
                setIsConfirmOpen(true);
              }
            }}
            isSubmitting={isSubmitting || isBackendGradedLocked}
          />
        </div>
      </div>

      {/* Confirmation Modal (Radix Dialog) */}
      <SubmitConfirmDialog
        isOpen={isConfirmOpen}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        bookmarkedCount={validBookmarkedCount}
        isSyncing={autosaveStatus === 'saving'}
        isSubmitting={isSubmitting}
        errorMessage={submitError}
        onConfirm={handleConfirmSubmit}
        onCancel={() => {
          if (!isSubmitting) setIsConfirmOpen(false);
        }}
      />
    </div>
  );
}
