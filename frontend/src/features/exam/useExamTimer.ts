import { useState, useEffect, useRef } from 'react';

const computeInitialSeconds = (totalQuestions: number, countdownMinutes?: number) =>
  countdownMinutes ? countdownMinutes * 60 : Math.max(15 * 60, totalQuestions * 75);

/**
 * Practice timer for TOEIC examination.
 * The backend does not enforce a server-side hard timeout or deadline.
 * Standard TOEIC practice guidelines:
 * - Full practice: 120 mins (7200s)
 * - Part 5/6 short practice: 15-20 mins (e.g. 75s per question, minimum 15 mins)
 *
 * This hook provides:
 * - Elapsed time (count up)
 * - Estimated countdown mode (count down from allotted seconds)
 * - Pause / resume support
 * - Warning when <= 5 mins remaining
 */
export function useExamTimer(
  totalQuestions: number,
  countdownMinutes?: number,
  sessionKey?: string
) {
  const initialSeconds = computeInitialSeconds(totalQuestions, countdownMinutes);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const intervalRef = useRef<number | null>(null);
  const initializedSessionRef = useRef<string | null>(
    totalQuestions > 0 || Boolean(countdownMinutes)
      ? sessionKey ?? `q:${totalQuestions}:${countdownMinutes ?? 'default'}`
      : null
  );
  const lastSessionKeyRef = useRef<string | undefined>(sessionKey);

  // Reset initialization marker when navigating to a distinct attempt session
  useEffect(() => {
    if (lastSessionKeyRef.current !== sessionKey) {
      lastSessionKeyRef.current = sessionKey;
      initializedSessionRef.current = null;
      setElapsedSeconds(0);
      setSecondsRemaining(computeInitialSeconds(totalQuestions, countdownMinutes));
    }
  }, [sessionKey, totalQuestions, countdownMinutes]);

  // Initialize countdown once attempt questions finish loading (totalQuestions > 0)
  useEffect(() => {
    const canInitialize = totalQuestions > 0 || Boolean(countdownMinutes);
    if (!canInitialize) return;

    const effectiveKey = sessionKey ?? `q:${totalQuestions}:${countdownMinutes ?? 'default'}`;
    if (initializedSessionRef.current === null) {
      initializedSessionRef.current = effectiveKey;
      setSecondsRemaining(computeInitialSeconds(totalQuestions, countdownMinutes));
      setElapsedSeconds(0);
    }
  }, [totalQuestions, countdownMinutes, sessionKey]);

  useEffect(() => {
    const canTick = isRunning && (totalQuestions > 0 || Boolean(countdownMinutes));
    if (!canTick) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, totalQuestions, countdownMinutes]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = secondsRemaining <= 5 * 60 && secondsRemaining > 0;
  const isTimeUp = secondsRemaining === 0;

  return {
    elapsedSeconds,
    secondsRemaining,
    formattedRemaining: formatTime(secondsRemaining),
    formattedElapsed: formatTime(elapsedSeconds),
    isWarning,
    isTimeUp,
    pause: () => setIsRunning(false),
    resume: () => setIsRunning(true),
  };
}
