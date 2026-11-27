import { useRef, useCallback, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { AttemptQuestion, AttemptView } from '@/types/attempt';
import { AutosaveStatus } from './types';

export interface UseExamAutosaveOptions {
  loadedAttemptId?: string;
  onConflict?: (attemptId: string) => void;
}

export function isValidQuestionChoice(
  question: AttemptQuestion | undefined,
  choice: string | null | undefined
): choice is 'A' | 'B' | 'C' | 'D' {
  if (!question || !choice || !['A', 'B', 'C', 'D'].includes(choice)) {
    return false;
  }
  const choiceText = question.choices?.[choice];
  return (
    choiceText !== undefined &&
    choiceText !== null &&
    String(choiceText).trim() !== ''
  );
}

function formatAutosaveError(err: unknown): string {
  if (err instanceof Error) {
    const cleanMsg = err.message.trim();
    const lower = cleanMsg.toLowerCase();
    if (lower.includes('failed to fetch') || lower.includes('network')) {
      return 'Không thể kết nối máy chủ để lưu đáp án.';
    }
    if (cleanMsg.startsWith('<') || lower.includes('<html') || lower.includes('<!doctype')) {
      return 'Lỗi phản hồi từ máy chủ khi đồng bộ đáp án.';
    }
    return cleanMsg || 'Lỗi đồng bộ câu trả lời lên máy chủ.';
  }
  return 'Lỗi đồng bộ câu trả lời lên máy chủ.';
}

export function useExamAutosave(
  attemptId: string,
  initialQuestions: AttemptView['questions'],
  loadedAttemptIdOrOptions?: string | UseExamAutosaveOptions
) {
  const loadedAttemptId =
    typeof loadedAttemptIdOrOptions === 'string'
      ? loadedAttemptIdOrOptions
      : loadedAttemptIdOrOptions?.loadedAttemptId;
  const onConflict =
    typeof loadedAttemptIdOrOptions === 'string'
      ? undefined
      : loadedAttemptIdOrOptions?.onConflict;

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmed server-side answer map for the active attempt session
  const serverAnswersRef = useRef<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // Latest learner answer intent for each question
  const pendingAnswersRef = useRef<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // Single-flight worker promise tracking
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);
  const isComponentMountedRef = useRef(true);
  const activeAttemptIdRef = useRef<string>(attemptId);
  const hydratedAttemptIdRef = useRef<string | null>(null);
  const sessionSeqRef = useRef<number>(0);
  const isLockedGradedRef = useRef<boolean>(false);
  const lastSavedAtRef = useRef<Date | null>(null);
  const onConflictRef = useRef(onConflict);
  onConflictRef.current = onConflict;

  const checkHasUnsynced = useCallback((): boolean => {
    const pendingKeys = Object.keys(pendingAnswersRef.current);
    return pendingKeys.some(
      (k) => pendingAnswersRef.current[k] !== serverAnswersRef.current[k]
    );
  }, []);

  // Reset refs and state when navigating to a different attemptId
  useEffect(() => {
    if (activeAttemptIdRef.current === attemptId) return;
    sessionSeqRef.current += 1;
    activeAttemptIdRef.current = attemptId;
    hydratedAttemptIdRef.current = null;
    isLockedGradedRef.current = false;
    serverAnswersRef.current = {};
    pendingAnswersRef.current = {};
    activeSavePromiseRef.current = null;
    lastSavedAtRef.current = null;
    setStatus('idle');
    setHasPendingChanges(false);
    setLastSavedAt(null);
    setErrorMessage(null);
  }, [attemptId]);

  // Initial hydration strictly once per attemptId; ignore background refetches
  useEffect(() => {
    const isReadyToHydrate =
      Boolean(attemptId) &&
      (loadedAttemptId ? loadedAttemptId === attemptId : initialQuestions.length > 0);
    if (!isReadyToHydrate) return;

    if (hydratedAttemptIdRef.current === attemptId) {
      return;
    }

    const initialMap: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
    initialQuestions.forEach((q) => {
      if (isValidQuestionChoice(q, q.selectedChoice)) {
        initialMap[q.id] = q.selectedChoice;
      }
    });

    hydratedAttemptIdRef.current = attemptId;
    serverAnswersRef.current = { ...initialMap, ...serverAnswersRef.current };
    pendingAnswersRef.current = { ...initialMap, ...pendingAnswersRef.current };
    setHasPendingChanges(checkHasUnsynced());
  }, [attemptId, initialQuestions, loadedAttemptId, checkHasUnsynced]);

  // Serialized single-flight worker that drains pending saves one by one
  const drainQueue = useCallback(async (): Promise<void> => {
    if (activeSavePromiseRef.current) {
      return activeSavePromiseRef.current;
    }

    const targetAttemptId = activeAttemptIdRef.current;
    const targetSessionSeq = sessionSeqRef.current;
    if (!targetAttemptId || isLockedGradedRef.current) {
      return Promise.resolve();
    }

    if (!checkHasUnsynced()) {
      setHasPendingChanges(false);
      return Promise.resolve();
    }

    let encounteredError = false;
    let didConfirmAnySave = false;
    let workerPromise: Promise<void> | null = null;

    workerPromise = (async () => {
      try {
        // Yield a microtask so activeSavePromiseRef.current is always assigned before cleanup/finally
        // and synchronous same-tick edits coalesce into the latest choice.
        await Promise.resolve();

        while (
          isComponentMountedRef.current &&
          !isLockedGradedRef.current &&
          activeAttemptIdRef.current === targetAttemptId &&
          sessionSeqRef.current === targetSessionSeq
        ) {
          const pendingKeys = Object.keys(pendingAnswersRef.current);
          const nextKey = pendingKeys.find(
            (k) => pendingAnswersRef.current[k] !== serverAnswersRef.current[k]
          );

          if (!nextKey) {
            break;
          }

          const choiceToSave = pendingAnswersRef.current[nextKey];
          // Clear confirmed server state for this question once an unconfirmed mutation starts
          delete serverAnswersRef.current[nextKey];

          if (isComponentMountedRef.current) {
            setStatus('saving');
            setHasPendingChanges(true);
          }

          try {
            await apiRequest<AttemptView>(
              `/ms/v1/attempts/${targetAttemptId}/answers/${nextKey}`,
              {
                method: 'PUT',
                body: JSON.stringify({ choice: choiceToSave }),
              }
            );

            if (
              !isComponentMountedRef.current ||
              isLockedGradedRef.current ||
              activeAttemptIdRef.current !== targetAttemptId ||
              sessionSeqRef.current !== targetSessionSeq
            ) {
              return;
            }

            serverAnswersRef.current[nextKey] = choiceToSave;
            didConfirmAnySave = true;
            setHasPendingChanges(checkHasUnsynced());
          } catch (err: unknown) {
            if (
              !isComponentMountedRef.current ||
              isLockedGradedRef.current ||
              activeAttemptIdRef.current !== targetAttemptId ||
              sessionSeqRef.current !== targetSessionSeq
            ) {
              return;
            }

            encounteredError = true;
            setStatus('error');
            setHasPendingChanges(checkHasUnsynced());

            if (err instanceof ApiError && err.isConflict()) {
              setErrorMessage(
                'Máy chủ từ chối cập nhật đáp án (HTTP 409). Đang xác minh trạng thái lượt thi...'
              );
              onConflictRef.current?.(targetAttemptId);
            } else {
              setErrorMessage(formatAutosaveError(err));
            }
            break;
          }
        }
      } finally {
        if (activeSavePromiseRef.current === workerPromise) {
          activeSavePromiseRef.current = null;
        }
      }

      if (
        !encounteredError &&
        !isLockedGradedRef.current &&
        isComponentMountedRef.current &&
        activeAttemptIdRef.current === targetAttemptId &&
        sessionSeqRef.current === targetSessionSeq
      ) {
        if (checkHasUnsynced()) {
          return drainQueue();
        }
        setHasPendingChanges(false);
        setErrorMessage(null);
        if (didConfirmAnySave || lastSavedAtRef.current !== null) {
          const savedTime = new Date();
          lastSavedAtRef.current = savedTime;
          setLastSavedAt(savedTime);
          setStatus('saved');
        } else {
          setStatus('idle');
        }
      }
    })();

    activeSavePromiseRef.current = workerPromise;
    return workerPromise;
  }, [checkHasUnsynced]);

  // Mount/unmount lifecycle guard (supports React StrictMode cleanup/remount without losing pending edits)
  useEffect(() => {
    isComponentMountedRef.current = true;
    if (checkHasUnsynced() && !activeSavePromiseRef.current && !isLockedGradedRef.current) {
      void drainQueue();
    }
    return () => {
      isComponentMountedRef.current = false;
      sessionSeqRef.current += 1;
      activeSavePromiseRef.current = null;
    };
  }, [checkHasUnsynced, drainQueue]);

  // Queue an answer change
  const queueAnswer = useCallback(
    (questionId: string, choice: 'A' | 'B' | 'C' | 'D') => {
      if (isLockedGradedRef.current) return;

      if (
        pendingAnswersRef.current[questionId] === choice &&
        serverAnswersRef.current[questionId] === choice
      ) {
        if (!checkHasUnsynced() && !activeSavePromiseRef.current) {
          setHasPendingChanges(false);
        }
        return;
      }

      pendingAnswersRef.current[questionId] = choice;
      setHasPendingChanges(true);
      setStatus('saving');
      setErrorMessage(null);
      void drainQueue();
    },
    [checkHasUnsynced, drainQueue]
  );

  // Explicit sync/wait before submit
  const syncPending = useCallback(async (): Promise<boolean> => {
    if (isLockedGradedRef.current) {
      return false;
    }
    if (!checkHasUnsynced() && !activeSavePromiseRef.current) {
      return true;
    }
    await drainQueue();
    while (activeSavePromiseRef.current) {
      await activeSavePromiseRef.current;
    }
    return !isLockedGradedRef.current && !checkHasUnsynced();
  }, [checkHasUnsynced, drainQueue]);

  // Halt autosave immediately when backend confirms attempt is GRADED
  const stopAutosaveForGraded = useCallback(() => {
    isLockedGradedRef.current = true;
    sessionSeqRef.current += 1;
    activeSavePromiseRef.current = null;
  }, []);

  return {
    status,
    hasPendingChanges,
    lastSavedAt,
    errorMessage,
    queueAnswer,
    syncPending,
    retry: drainQueue,
    stopAutosaveForGraded,
  };
}
