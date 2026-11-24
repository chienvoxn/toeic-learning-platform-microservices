import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { QuizView } from '@/types/quiz';
import { QuestionCanvas } from '@/features/exam/QuestionCanvas';
import { QuestionPalette } from '@/features/exam/QuestionPalette';
import { SubmitConfirmDialog } from '@/features/exam/SubmitConfirmDialog';
import { AutosaveIndicator } from '@/features/exam/AutosaveIndicator';
import { useExamAutosave } from '@/features/exam/useExamAutosave';
import { useExamTimer } from '@/features/exam/useExamTimer';
import { useExamKeyboardShortcuts } from '@/features/exam/useExamKeyboardShortcuts';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft, ShieldAlert } from 'lucide-react';

export function ExamScreenPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch Attempt Data
  const {
    data: attempt,
    isLoading: isAttemptLoading,
    isError: isAttemptError,
    error: attemptError,
  } = useQuery<AttemptView>({
    queryKey: ['attempt', attemptId],
    queryFn: () => apiRequest<AttemptView>(`/ms/v1/attempts/${attemptId}`),
    enabled: Boolean(attemptId),
    retry: 1,
    staleTime: 0, // Always fresh on mount
  });

  // 2. Fetch Quiz Title / Metadata for display
  const { data: quiz } = useQuery<QuizView>({
    queryKey: ['quiz', attempt?.quizId],
    queryFn: () => apiRequest<QuizView>(`/ms/v1/contents/quizzes/${attempt?.quizId}`),
    enabled: Boolean(attempt?.quizId),
    staleTime: 1000 * 60 * 5,
  });

  const questions = useMemo(() => attempt?.questions || [], [attempt?.questions]);
  const totalQuestions = questions.length;

  // 3. Setup Autosave
  const {
    status: autosaveStatus,
    lastSavedAt,
    errorMessage: autosaveError,
    queueAnswer,
    syncPending,
    retry: retryAutosave,
  } = useExamAutosave(attemptId || '', questions);

  // 4. Setup Practice Timer
  const {
    formattedRemaining,
    isWarning: isTimerWarning,
  } = useExamTimer(totalQuestions);

  // 5. Restore saved choices on attempt load
  useEffect(() => {
    if (attempt) {
      if (attempt.status === 'GRADED') {
        // If already graded, redirect immediately to result view
        navigate(`/learner/results/${attempt.id}`, { replace: true });
        return;
      }

      const restored: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
      attempt.questions.forEach((q) => {
        if (q.selectedChoice && ['A', 'B', 'C', 'D'].includes(q.selectedChoice)) {
          restored[q.id] = q.selectedChoice as 'A' | 'B' | 'C' | 'D';
        }
      });
      setSelectedAnswers(restored);
    }
  }, [attempt, navigate]);

  // Handle Choice Selection
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B' | 'C' | 'D') => {
      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;

      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: choice,
      }));

      queueAnswer(currentQuestion.id, choice);
    },
    [questions, currentIndex, queueAnswer]
  );

  // Handle Bookmarks
  const handleToggleBookmark = useCallback(() => {
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
  }, [questions, currentIndex]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Setup Keyboard Shortcuts
  useExamKeyboardShortcuts({
    onSelectChoice: handleSelectChoice,
    onNext: handleNext,
    onPrev: handlePrev,
    onToggleBookmark: handleToggleBookmark,
    enabled: !isConfirmOpen && !isSubmitting && attempt?.status === 'IN_PROGRESS',
  });

  // Submit Handler
  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step A: Ensure all queued answer writes are safely persisted to server
      const syncOk = await syncPending();
      if (!syncOk) {
        throw new Error('Chưa đồng bộ xong đáp án lên máy chủ. Vui lòng thử lại sau vài giây.');
      }

      // Step B: Submit attempt (graded by backend DDD Aggregate)
      const graded = await apiRequest<AttemptView>(`/ms/v1/attempts/${attemptId}/submit`, {
        method: 'POST',
      });

      // Step C: Invalidate attempt caches
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] });
      queryClient.invalidateQueries({ queryKey: ['learner-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['learner-activities'] });

      // Step D: Navigate directly to result review page
      navigate(`/learner/results/${graded.id}`, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nộp bài thất bại. Vui lòng thử lại.';
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isAttemptLoading) {
    return (
      <div className="space-y-4 py-8">
        <div className="flex items-center justify-between">
          <SkeletonLoader className="w-48 h-6" />
          <SkeletonLoader className="w-32 h-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <SkeletonLoader className="h-96 w-full rounded-xl" />
          </div>
          <div className="md:col-span-1">
            <SkeletonLoader className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error / Unauthorized / Expired state
  if (isAttemptError || !attempt) {
    const errorMsg = attemptError instanceof Error ? attemptError.message : 'Không tìm thấy lượt thi.';
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Không thể tải bài thi</h2>
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <Link to="/learner/history">
          <Button variant="primary" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Về danh sách lịch sử thi
          </Button>
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Exam Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 truncate max-w-md">
            {quiz ? quiz.title : 'Bài thi trắc nghiệm TOEIC'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span>Mã: <code className="font-mono text-slate-700">{attempt.id.slice(0, 8)}</code></span>
            <span>•</span>
            <AutosaveIndicator
              status={autosaveStatus}
              lastSavedAt={lastSavedAt}
              errorMessage={autosaveError}
              onRetry={retryAutosave}
            />
          </div>
        </div>

        {/* Practice Timer */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-sm transition-colors ${
            isTimerWarning
              ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
              : 'bg-blue-50/60 border-blue-200 text-blue-700'
          }`}
          title="Thời gian làm bài ước tính"
        >
          <Clock className="h-4 w-4" />
          <span>{formattedRemaining}</span>
        </div>
      </div>

      {/* Main Examination Viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Question Canvas */}
        <div className="lg:col-span-3 flex flex-col">
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
            />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500">Đề thi chưa có câu hỏi nào.</p>
            </div>
          )}
        </div>

        {/* Right Column: Question Palette */}
        <div className="lg:col-span-1">
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            selectedAnswers={selectedAnswers}
            bookmarks={bookmarks}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
            onSubmitClick={() => setIsConfirmOpen(true)}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <SubmitConfirmDialog
        isOpen={isConfirmOpen}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        bookmarkedCount={bookmarks.size}
        isSyncing={autosaveStatus === 'saving'}
        isSubmitting={isSubmitting}
        errorMessage={submitError}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
