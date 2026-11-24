import { useRef, useCallback, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { AutosaveStatus } from './types';

export function useExamAutosave(attemptId: string, initialQuestions: AttemptView['questions']) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep a map of confirmed saved answers on server
  const serverAnswersRef = useRef<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // Latest intent for each question
  const pendingAnswersRef = useRef<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // Running promise queue to ensure sequential single-flight saves
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);
  const isComponentMountedRef = useRef(true);

  // Initialize server answers from attempt data
  useEffect(() => {
    isComponentMountedRef.current = true;
    const initialMap: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
    initialQuestions.forEach((q) => {
      if (q.selectedChoice && ['A', 'B', 'C', 'D'].includes(q.selectedChoice)) {
        initialMap[q.id] = q.selectedChoice as 'A' | 'B' | 'C' | 'D';
      }
    });
    serverAnswersRef.current = { ...initialMap };
    pendingAnswersRef.current = { ...initialMap };

    return () => {
      isComponentMountedRef.current = false;
    };
  }, [initialQuestions]);

  // Serialized worker that processes pending saves one by one
  const drainQueue = useCallback(async () => {
    if (activeSavePromiseRef.current) {
      return activeSavePromiseRef.current;
    }

    const runner = async () => {
      while (isComponentMountedRef.current) {
        // Find next question where pending != server
        const pendingKeys = Object.keys(pendingAnswersRef.current);
        const nextKey = pendingKeys.find(
          (k) => pendingAnswersRef.current[k] !== serverAnswersRef.current[k]
        );

        if (!nextKey) {
          // All pending synced!
          if (isComponentMountedRef.current) {
            setStatus('saved');
            setLastSavedAt(new Date());
            setErrorMessage(null);
          }
          break;
        }

        const choiceToSave = pendingAnswersRef.current[nextKey];
        if (isComponentMountedRef.current) {
          setStatus('saving');
        }

        try {
          await apiRequest<AttemptView>(`/ms/v1/attempts/${attemptId}/answers/${nextKey}`, {
            method: 'PUT',
            body: JSON.stringify({ choice: choiceToSave }),
          });

          // Mark as confirmed on server
          serverAnswersRef.current[nextKey] = choiceToSave;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Lỗi đồng bộ câu trả lời';
          if (isComponentMountedRef.current) {
            setStatus('error');
            setErrorMessage(msg);
          }
          // Do not drop the pending intent so the user can retry or submit will wait/fail safely
          break;
        }
      }
    };

    activeSavePromiseRef.current = runner().finally(() => {
      activeSavePromiseRef.current = null;
    });

    return activeSavePromiseRef.current;
  }, [attemptId]);

  // Queue an answer change
  const queueAnswer = useCallback(
    (questionId: string, choice: 'A' | 'B' | 'C' | 'D') => {
      pendingAnswersRef.current[questionId] = choice;
      setStatus('saving');
      drainQueue();
    },
    [drainQueue]
  );

  // Explicit sync/wait before submit
  const syncPending = useCallback(async (): Promise<boolean> => {
    // If there's an ongoing or needed sync
    await drainQueue();
    // Verify all pending equals server
    const pendingKeys = Object.keys(pendingAnswersRef.current);
    const hasUnsynced = pendingKeys.some(
      (k) => pendingAnswersRef.current[k] !== serverAnswersRef.current[k]
    );
    return !hasUnsynced;
  }, [drainQueue]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    queueAnswer,
    syncPending,
    retry: drainQueue,
  };
}
