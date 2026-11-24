import { useState, useEffect, useRef } from 'react';

/**
 * Practice timer for TOEIC examination.
 * The backend does not enforce a server-side hard timeout or deadline.
 * Standard TOEIC practice guidelines:
 * - Full practice: 120 mins (7200s)
 * - Part 5/6 short practice: 15-20 mins (e.g. 75s per question)
 *
 * This hook provides:
 * - Elapsed time (count up)
 * - Configurable countdown mode (count down from allotted seconds)
 * - Pause / resume support
 * - Warning when < 5 mins remaining
 */
export function useExamTimer(totalQuestions: number, countdownMinutes?: number) {
  // If countdownMinutes is specified, use that; otherwise allocate standard ~75s per question
  const initialSeconds = countdownMinutes
    ? countdownMinutes * 60
    : Math.max(15 * 60, totalQuestions * 75);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
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
  }, [isRunning]);

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
