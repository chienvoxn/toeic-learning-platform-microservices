import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { AttemptQuestion, AttemptView } from '@/types/attempt';
import { QuizDetail } from '@/types/quiz';
import { useExamAutosave, isValidQuestionChoice } from '@/features/exam/useExamAutosave';
import { useExamTimer } from '@/features/exam/useExamTimer';
import { useExamKeyboardShortcuts } from '@/features/exam/useExamKeyboardShortcuts';
import { QuestionCanvas } from '@/features/exam/QuestionCanvas';
import { ExamScreenPage } from '@/pages/exam/ExamScreenPage';

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      userId: 'learner-1',
      email: 'learner@toeic.vn',
      displayName: 'Test Learner',
      role: 'LEARNER',
      roles: ['LEARNER'],
    },
    roles: ['LEARNER'],
    permissions: ['assessment:submit'],
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r: string) => r === 'LEARNER',
    hasPermission: () => true,
    logout: vi.fn(),
  }),
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeQuestion(
  id: string,
  position: number,
  selectedChoice: string | null = null,
  isPart2 = false
): AttemptQuestion {
  return {
    id,
    position,
    prompt: `Question ${position} prompt`,
    choices: isPart2
      ? {
          A: `Option A (${position})`,
          B: `Option B (${position})`,
          C: `Option C (${position})`,
        }
      : {
          A: `Option A (${position})`,
          B: `Option B (${position})`,
          C: `Option C (${position})`,
          D: `Option D (${position})`,
        },
    selectedChoice,
    correct: null,
    explanation: null,
  };
}

function makeAttempt(
  id: string,
  status: 'IN_PROGRESS' | 'GRADED',
  questions: AttemptQuestion[]
): AttemptView {
  return {
    id,
    quizId: 'quiz-1',
    status,
    total: questions.length,
    correct: status === 'GRADED' ? 1 : null,
    createdAt: '2026-11-28T00:00:00Z',
    questions,
  };
}

describe('Phase 8B.1: Exam Safety Regression Suite (EX-R01 to EX-R10)', () => {
  const mockedApiRequest = vi.mocked(apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // EX-R01 — Refetch During Autosave
  // =========================================================================
  it('EX-R01: background refetch returning stale snapshot does not rollback in-flight pending choices', async () => {
    const q1Initial = makeQuestion('q1', 1, null);
    const putDeferred = createDeferred<AttemptView>();

    mockedApiRequest.mockImplementation(async (path, opts) => {
      if (path === '/ms/v1/attempts/att-ex01/answers/q1' && opts?.method === 'PUT') {
        return putDeferred.promise;
      }
      return makeAttempt('att-ex01', 'IN_PROGRESS', [q1Initial]);
    });

    const { result, rerender } = renderHook(
      ({ questions }) =>
        useExamAutosave('att-ex01', questions, { loadedAttemptId: 'att-ex01' }),
      { initialProps: { questions: [q1Initial] } }
    );

    // 1. User selects answer 'B'
    act(() => {
      result.current.queueAnswer('q1', 'B');
    });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/ms/v1/attempts/att-ex01/answers/q1',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ choice: 'B' }) })
      );
    });

    expect(result.current.status).toBe('saving');

    // 2. Simulate stale background refetch arriving while PUT is in flight
    // Stale snapshot says q1 is still null
    rerender({ questions: [q1Initial] });

    // The hook must ignore background refetch for already hydrated session and maintain saving status
    expect(result.current.status).toBe('saving');

    // 3. Resolve in-flight PUT
    await act(async () => {
      putDeferred.resolve(
        makeAttempt('att-ex01', 'IN_PROGRESS', [makeQuestion('q1', 1, 'B')])
      );
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect(result.current.hasPendingChanges).toBe(false);
  });

  // =========================================================================
  // EX-R02 — Attempt Session Isolation
  // =========================================================================
  it('EX-R02: switching attempt A -> B discards late responses from A and does not contaminate B', async () => {
    const putDeferredA = createDeferred<AttemptView>();

    mockedApiRequest.mockImplementation(async (path, opts) => {
      if (path === '/ms/v1/attempts/att-A/answers/q1' && opts?.method === 'PUT') {
        return putDeferredA.promise;
      }
      if (path === '/ms/v1/attempts/att-B/answers/q2' && opts?.method === 'PUT') {
        return makeAttempt('att-B', 'IN_PROGRESS', [makeQuestion('q2', 1, 'C')]);
      }
      return makeAttempt('att-default', 'IN_PROGRESS', []);
    });

    const onConflictMock = vi.fn();

    const { result, rerender } = renderHook(
      ({ attemptId, questions }) =>
        useExamAutosave(attemptId, questions, {
          loadedAttemptId: attemptId,
          onConflict: onConflictMock,
        }),
      {
        initialProps: {
          attemptId: 'att-A',
          questions: [makeQuestion('q1', 1, null)],
        },
      }
    );

    // Queue choice on Attempt A
    act(() => {
      result.current.queueAnswer('q1', 'A');
    });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/ms/v1/attempts/att-A/answers/q1',
        expect.anything()
      );
    });

    // Navigate to Attempt B before A finishes
    rerender({
      attemptId: 'att-B',
      questions: [makeQuestion('q2', 1, null)],
    });

    expect(result.current.status).toBe('idle');

    // Late resolve or 409 from Attempt A must be discarded by sessionSeqRef
    await act(async () => {
      putDeferredA.reject(new ApiError(409, 'Conflict on A'));
    });

    // onConflict must NOT be called for Attempt B
    expect(onConflictMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');

    // Queue answer on Attempt B works cleanly
    act(() => {
      result.current.queueAnswer('q2', 'C');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/ms/v1/attempts/att-B/answers/q2',
      expect.anything()
    );
  });

  // =========================================================================
  // EX-R03 — Cross-Session In-Flight Ordering
  // =========================================================================
  it('EX-R03: preserves latest answer intent across multiple sequential mutations', async () => {
    const q1 = makeQuestion('q1', 1, null);
    const putDeferred1 = createDeferred<AttemptView>();
    const putDeferred2 = createDeferred<AttemptView>();

    mockedApiRequest
      .mockImplementationOnce(() => putDeferred1.promise)
      .mockImplementationOnce(() => putDeferred2.promise);

    const { result } = renderHook(() =>
      useExamAutosave('att-ord', [q1], { loadedAttemptId: 'att-ord' })
    );

    // Select 'A'
    act(() => {
      result.current.queueAnswer('q1', 'A');
    });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    });

    // While PUT A is in flight, user changes mind: B -> D
    act(() => {
      result.current.queueAnswer('q1', 'B');
      result.current.queueAnswer('q1', 'D');
    });

    // Resolve first PUT
    await act(async () => {
      putDeferred1.resolve(makeAttempt('att-ord', 'IN_PROGRESS', [makeQuestion('q1', 1, 'A')]));
    });

    // Second PUT should be dispatched with latest intent 'D' (B is coalesced away)
    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledTimes(2);
    });

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      '/ms/v1/attempts/att-ord/answers/q1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ choice: 'D' }),
      })
    );

    // Resolve second PUT
    await act(async () => {
      putDeferred2.resolve(makeAttempt('att-ord', 'IN_PROGRESS', [makeQuestion('q1', 1, 'D')]));
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
  });

  // =========================================================================
  // EX-R04 — GRADED Cache Integrity
  // =========================================================================
  it('EX-R04: once locked GRADED, stale in-progress background queries do not reopen exam room', async () => {
    const gradedAttempt = makeAttempt('att-graded', 'GRADED', [makeQuestion('q1', 1, 'A')]);
    const inProgressAttempt = makeAttempt('att-graded', 'IN_PROGRESS', [makeQuestion('q1', 1, null)]);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Test Quiz', part: 5, premium: false, count: 1 },
      questions: [],
    };

    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/attempts/att-graded') return gradedAttempt;
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      throw new Error(`Unexpected request: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-graded']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
            <Route
              path="/learner/results/:attemptId"
              element={<div data-testid="results-view">Results View</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Must immediately redirect to results view
    expect(await screen.findByTestId('results-view')).toBeInTheDocument();

    // Now simulate a stale query arriving in queryClient
    act(() => {
      queryClient.setQueryData(['attempt', 'att-graded'], inProgressAttempt);
    });

    // Room must NOT reopen
    expect(screen.getByTestId('results-view')).toBeInTheDocument();
    expect(screen.queryByText(/Nộp bài thi/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // EX-R05 — HTTP 409 Recovery (Both branches)
  // =========================================================================
  it('EX-R05 (Branch A): HTTP 409 when server confirms IN_PROGRESS shows alert and retains pending answers', async () => {
    const initialQuestions = [makeQuestion('q1', 1, null)];
    const initialAttempt = makeAttempt('att-409-prog', 'IN_PROGRESS', initialQuestions);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    let attemptGetCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-409-prog' && (!options || options.method === 'GET')) {
        attemptGetCount += 1;
        return initialAttempt; // Server confirms still IN_PROGRESS
      }
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-409-prog/answers/q1' && options?.method === 'PUT') {
        throw new ApiError(409, 'Conflict');
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-409-prog']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const optionA = await screen.findByRole('radio', { name: /Option A \(1\)/i });
    fireEvent.click(optionA);

    // Verify alert message for IN_PROGRESS conflict
    expect(
      await screen.findByText(/Máy chủ báo xung đột \(HTTP 409\) nhưng lượt thi vẫn đang Đang làm/i)
    ).toBeInTheDocument();
    expect(attemptGetCount).toBe(2);
  });

  it('EX-R05 (Branch B): HTTP 409 when server verification fails shows connection error alert', async () => {
    const initialQuestions = [makeQuestion('q1', 1, null)];
    const initialAttempt = makeAttempt('att-409-fail', 'IN_PROGRESS', initialQuestions);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    let attemptGetCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-409-fail' && (!options || options.method === 'GET')) {
        attemptGetCount += 1;
        if (attemptGetCount === 1) return initialAttempt;
        throw new Error('Network error on verify');
      }
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-409-fail/answers/q1' && options?.method === 'PUT') {
        throw new ApiError(409, 'Conflict');
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-409-fail']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const optionB = await screen.findByRole('radio', { name: /Option B \(1\)/i });
    fireEvent.click(optionB);

    expect(
      await screen.findByText(/Không thể xác minh trạng thái lượt thi từ máy chủ do lỗi kết nối/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // EX-R06 — Uncertain Submit Response
  // =========================================================================
  it('EX-R06: POST /submit network failure recovers cleanly if server verification confirms GRADED', async () => {
    const initialQuestions = [makeQuestion('q1', 1, 'A')];
    const initialAttempt = makeAttempt('att-uncert', 'IN_PROGRESS', initialQuestions);
    const gradedAttempt = makeAttempt('att-uncert', 'GRADED', initialQuestions);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    let attemptGetCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-uncert' && (!options || options.method === 'GET')) {
        attemptGetCount += 1;
        return attemptGetCount === 1 ? initialAttempt : gradedAttempt;
      }
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-uncert/submit' && options?.method === 'POST') {
        throw new Error('Network timeout after grading processed');
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-uncert']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
            <Route
              path="/learner/results/:attemptId"
              element={<div data-testid="results-recovered">Recovered Results View</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Open submit dialog
    const submitBtn = await screen.findByRole('button', { name: /Nộp bài thi/i });
    fireEvent.click(submitBtn);

    // Confirm submit in dialog
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận nộp bài/i });
    fireEvent.click(confirmBtn);

    // Must navigate to results page because verification confirmed GRADED
    expect(await screen.findByTestId('results-recovered')).toBeInTheDocument();
  });

  // =========================================================================
  // EX-R07 — Submission Lock & Mutation Guard
  // =========================================================================
  it('EX-R07: blocks choice modification and duplicate submits while submit is pending', async () => {
    const questions = [makeQuestion('q1', 1, 'A')];
    const initialAttempt = makeAttempt('att-lock', 'IN_PROGRESS', questions);
    const submitDeferred = createDeferred<AttemptView>();
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-lock' && (!options || options.method === 'GET')) {
        return initialAttempt;
      }
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-lock/submit' && options?.method === 'POST') {
        return submitDeferred.promise;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-lock']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
            <Route
              path="/learner/results/:attemptId"
              element={<div data-testid="results-final">Final Results</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: /Nộp bài thi/i });
    fireEvent.click(submitBtn);

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận nộp bài/i });
    fireEvent.click(confirmBtn);

    // While submit is pending, attempting to click option B (hidden behind modal backdrop) must NOT trigger PUT
    const optionB = screen.getByRole('radio', { name: /Option B \(1\)/i, hidden: true });
    fireEvent.click(optionB);

    const putCalls = mockedApiRequest.mock.calls.filter(([, opt]) => opt?.method === 'PUT');
    expect(putCalls).toHaveLength(0);

    // Resolve submit
    await act(async () => {
      submitDeferred.resolve(makeAttempt('att-lock', 'GRADED', questions));
    });

    expect(await screen.findByTestId('results-final')).toBeInTheDocument();
  });

  // =========================================================================
  // EX-R08 — Part 2 & Keyboard Shortcuts
  // =========================================================================
  it('EX-R08: Part 2 restricts choices to A-C and keyboard shortcuts handle valid keys, bookmark, and ignore held-repeat', () => {
    const qPart2 = makeQuestion('q-p2', 1, null, true); // 3 choices A, B, C

    expect(isValidQuestionChoice(qPart2, 'A')).toBe(true);
    expect(isValidQuestionChoice(qPart2, 'B')).toBe(true);
    expect(isValidQuestionChoice(qPart2, 'C')).toBe(true);
    expect(isValidQuestionChoice(qPart2, 'D')).toBe(false); // D is invalid for Part 2

    const onSelectChoice = vi.fn();
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onToggleBookmark = vi.fn();

    renderHook(() =>
      useExamKeyboardShortcuts({
        onSelectChoice,
        onNext,
        onPrev,
        onToggleBookmark,
        enabled: true,
      })
    );

    // 1. Valid choice keypress
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onSelectChoice).toHaveBeenCalledWith('A');

    // 2. Number keypress
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(onSelectChoice).toHaveBeenCalledWith('B');

    // 3. Bookmark keys
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(onToggleBookmark).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    expect(onToggleBookmark).toHaveBeenCalledTimes(2);

    // 4. Navigation keys
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(onPrev).toHaveBeenCalledTimes(1);

    // 5. Held-key repeat is ignored
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true }));
    expect(onNext).toHaveBeenCalledTimes(1); // not incremented
  });

  // =========================================================================
  // EX-R09 — Timer & Resume
  // =========================================================================
  it('EX-R09: useExamTimer computes correct duration, handles 00:00 without hard stop, and resets on attempt change', () => {
    vi.useFakeTimers();

    // 10 questions = 750s, clamped to min 15 mins (900s)
    const { result, rerender } = renderHook(
      ({ count, session }) => useExamTimer(count, undefined, session),
      { initialProps: { count: 10, session: 'session-1' } }
    );

    expect(result.current.secondsRemaining).toBe(900);
    expect(result.current.formattedRemaining).toBe('15:00');
    expect(result.current.isWarning).toBe(false);

    // Advance 601 seconds -> 299s remaining (warning active)
    act(() => {
      vi.advanceTimersByTime(601000);
    });

    expect(result.current.isWarning).toBe(true);

    // Advance remaining time to 0
    act(() => {
      vi.advanceTimersByTime(300000);
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isTimeUp).toBe(true);
    expect(result.current.isWarning).toBe(false); // not warning when 0

    // Switch attempt session -> timer resets to 900s
    rerender({ count: 10, session: 'session-2' });
    expect(result.current.secondsRemaining).toBe(900);
    expect(result.current.elapsedSeconds).toBe(0);

    vi.useRealTimers();
  });

  // =========================================================================
  // EX-R10 — Exit & Media Fallbacks
  // =========================================================================
  it('EX-R10: QuestionCanvas displays error banners for media failures without disabling answer options', () => {
    const qWithMedia: AttemptQuestion = {
      ...makeQuestion('q-media', 1, null),
      audioUrl: 'https://example.com/audio-error.mp3',
      imageUrl: 'https://example.com/image-error.jpg',
    };

    const handleSelect = vi.fn();

    render(
      <QuestionCanvas
        question={qWithMedia}
        currentIndex={0}
        totalQuestions={1}
        selectedChoice={null}
        isBookmarked={false}
        onSelectChoice={handleSelect}
        onToggleBookmark={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        hasPrev={false}
        hasNext={false}
      />
    );

    // Trigger audio and image error
    const audio = screen.getByText('Trình duyệt của bạn không hỗ trợ phát âm thanh.').closest('audio');
    if (audio) {
      fireEvent.error(audio);
    }
    const img = screen.getByAltText(/Hình minh họa câu 1/i);
    fireEvent.error(img);

    // Audio error fallback banner must appear
    expect(
      screen.getByText(/Không thể tải tệp âm thanh cho câu hỏi này/i)
    ).toBeInTheDocument();

    // Image error fallback banner must appear
    expect(
      screen.getByText(/Không thể tải hình ảnh minh họa cho câu hỏi này/i)
    ).toBeInTheDocument();

    // User can still choose answers
    const optionA = screen.getByRole('radio', { name: /Option A \(1\)/i });
    fireEvent.click(optionA);
    expect(handleSelect).toHaveBeenCalledWith('A');
  });

  // =========================================================================
  // EX-R11 — P0-B: A -> B -> A Attempt Switching & Lifecycle Isolation
  // =========================================================================
  it('EX-R11: A -> B -> A attempt switching in ExamScreenPage isolates session state and prevents stuck locks or alert leaks', async () => {
    const qA = makeQuestion('q-A1', 1, null);
    const qB = makeQuestion('q-B1', 1, null);
    const attemptA = makeAttempt('att-A', 'IN_PROGRESS', [qA]);
    const attemptB = makeAttempt('att-B', 'IN_PROGRESS', [qB]);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    const putDeferredA = createDeferred<AttemptView>();

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-A' && (!options || options.method === 'GET')) return attemptA;
      if (path === '/ms/v1/attempts/att-B' && (!options || options.method === 'GET')) return attemptB;
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-A/answers/q-A1' && options?.method === 'PUT') {
        return putDeferredA.promise;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    function NavigationWrapper() {
      const navigate = useNavigate();
      return (
        <div>
          <button onClick={() => navigate('/exam/att-B')}>Go to B</button>
          <button onClick={() => navigate('/exam/att-A')}>Go to A</button>
          <ExamScreenPage />
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-A']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<NavigationWrapper />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial attempt A loaded
    expect(await screen.findByText('Question 1 prompt')).toBeInTheDocument();

    // Select option A on attempt A (triggers in-flight PUT)
    const optA = screen.getByRole('radio', { name: /Option A \(1\)/i });
    fireEvent.click(optA);

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/ms/v1/attempts/att-A/answers/q-A1',
        expect.anything()
      );
    });

    // Switch to attempt B
    fireEvent.click(screen.getByText('Go to B'));

    expect(await screen.findByText('Question 1 prompt')).toBeInTheDocument();

    // Switch back to attempt A while putDeferredA from visit 1 is still in flight!
    fireEvent.click(screen.getByText('Go to A'));

    expect(await screen.findByText('Question 1 prompt')).toBeInTheDocument();

    // Now attempt A's slow PUT from visit 1 fails with 409 conflict
    await act(async () => {
      putDeferredA.reject(new ApiError(409, 'Conflict on A from visit 1'));
    });

    // Session sequence tracking ensures delayed 409 from visit 1 does NOT leak into visit 2!
    expect(screen.queryByText(/Máy chủ báo xung đột/i)).not.toBeInTheDocument();

    // Session is fresh, interactive, and not locked
    expect(screen.getAllByRole('button', { name: /Nộp bài/i })[0]).not.toBeDisabled();
  });

  // =========================================================================
  // EX-R12 — P0-B: Real QueryClient GRADED Cache Rollback Protection
  // =========================================================================
  it('EX-R12: stale GET returning IN_PROGRESS resolving after GRADED never rolls back query cache or sends mutations', async () => {
    const q1 = makeQuestion('q1', 1, 'A');
    const inProgressAttempt = makeAttempt('att-graded-cache', 'IN_PROGRESS', [q1]);
    const gradedAttempt = makeAttempt('att-graded-cache', 'GRADED', [q1]);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    const staleGetDeferred = createDeferred<AttemptView>();

    let getCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-graded-cache' && (!options || options.method === 'GET')) {
        getCount += 1;
        if (getCount === 1) return inProgressAttempt;
        // Background refetch returning stale in-progress
        return staleGetDeferred.promise;
      }
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-graded-cache/submit' && options?.method === 'POST') {
        return gradedAttempt;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-graded-cache']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
            <Route
              path="/learner/results/:attemptId"
              element={<div data-testid="results-graded-view">Graded Results View</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial render in progress
    const submitBtn = await screen.findByRole('button', { name: /Nộp bài thi/i });

    // Trigger a background refetch
    void queryClient.refetchQueries({ queryKey: ['attempt', 'att-graded-cache'] });

    // Submit attempt
    fireEvent.click(submitBtn);
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận nộp bài/i });
    fireEvent.click(confirmBtn);

    // Result page is navigated to
    expect(await screen.findByTestId('results-graded-view')).toBeInTheDocument();

    // Cache is GRADED
    const cachedBefore = queryClient.getQueryData<AttemptView>(['attempt', 'att-graded-cache']);
    expect(cachedBefore?.status).toBe('GRADED');

    // Stale background GET resolves with IN_PROGRESS
    await act(async () => {
      staleGetDeferred.resolve(inProgressAttempt);
    });

    // QueryClient cache MUST NOT roll back to IN_PROGRESS
    const cachedAfter = queryClient.getQueryData<AttemptView>(['attempt', 'att-graded-cache']);
    expect(cachedAfter?.status).toBe('GRADED');

    // No PUT mutations dispatched after GRADED
    const putCalls = mockedApiRequest.mock.calls.filter(([, opt]) => opt?.method === 'PUT');
    expect(putCalls).toHaveLength(0);
  });

  // =========================================================================
  // EX-R13 — P0-B: Submit Flow Safety (Double-click, Pending Autosave, Failure)
  // =========================================================================
  it('EX-R13: double-click confirm dispatches single submit, and submit awaits pending autosave', async () => {
    const q1 = makeQuestion('q1', 1, null);
    const attempt = makeAttempt('att-submit-flow', 'IN_PROGRESS', [q1]);
    const graded = makeAttempt('att-submit-flow', 'GRADED', [makeQuestion('q1', 1, 'C')]);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    const putDeferred = createDeferred<AttemptView>();
    const submitDeferred = createDeferred<AttemptView>();

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-submit-flow' && (!options || options.method === 'GET')) return attempt;
      if (path === '/ms/v1/contents/quizzes/quiz-1') return quizDetail;
      if (path === '/ms/v1/attempts/att-submit-flow/answers/q1' && options?.method === 'PUT') {
        return putDeferred.promise;
      }
      if (path === '/ms/v1/attempts/att-submit-flow/submit' && options?.method === 'POST') {
        return submitDeferred.promise;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-submit-flow']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
            <Route
              path="/learner/results/:attemptId"
              element={<div data-testid="results-flow-done">Results Flow Done</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Select option C (triggers in-flight PUT)
    const optC = await screen.findByRole('radio', { name: /Option C \(1\)/i });
    fireEvent.click(optC);

    // Open submit dialog
    const submitBtn = screen.getAllByRole('button', { name: /Nộp bài/i })[0];
    fireEvent.click(submitBtn);

    // While autosave PUT is in flight, submit dialog indicates syncing and disables confirm
    expect(await screen.findByText(/Đang đồng bộ đáp án lên máy chủ trước khi nộp bài/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đang đồng bộ đáp án/i })).toBeDisabled();

    // Resolve pending PUT
    await act(async () => {
      putDeferred.resolve(makeAttempt('att-submit-flow', 'IN_PROGRESS', [makeQuestion('q1', 1, 'C')]));
    });

    // Once synced, button becomes enabled 'Xác nhận nộp bài'
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận nộp bài/i });
    expect(confirmBtn).not.toBeDisabled();

    // Double-click confirm button rapidly
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    // POST /submit must be called exactly once
    await waitFor(() => {
      const submitCallsAfter = mockedApiRequest.mock.calls.filter(([, opt]) => opt?.method === 'POST');
      expect(submitCallsAfter).toHaveLength(1);
    });

    // Resolve POST /submit
    await act(async () => {
      submitDeferred.resolve(graded);
    });

    expect(await screen.findByTestId('results-flow-done')).toBeInTheDocument();
  });
});
