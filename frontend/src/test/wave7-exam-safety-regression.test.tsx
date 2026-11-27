import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { AttemptQuestion, AttemptView } from '@/types/attempt';
import { QuizDetail } from '@/types/quiz';
import { useExamAutosave } from '@/features/exam/useExamAutosave';
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

function makeQuestion(id: string, position: number, selectedChoice: string | null = null): AttemptQuestion {
  return {
    id,
    position,
    prompt: `Question ${position} prompt`,
    choices: {
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

function makeAttempt(id: string, status: 'IN_PROGRESS' | 'GRADED', questions: AttemptQuestion[]): AttemptView {
  return {
    id,
    quizId: 'quiz-1',
    status,
    total: questions.length,
    correct: status === 'GRADED' ? 1 : null,
    createdAt: '2026-11-27T00:00:00Z',
    questions,
  };
}

describe('Wave 7 Release Blocker Regression Tests (Production Hooks & Components)', () => {
  const mockedApiRequest = vi.mocked(apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('C1: re-selecting already confirmed choice A does not lock queue for subsequent questions', async () => {
    const questions = [makeQuestion('q1', 1, 'A'), makeQuestion('q2', 2, null)];
    mockedApiRequest.mockResolvedValue(makeAttempt('att-1', 'IN_PROGRESS', questions));

    const { result } = renderHook(() =>
      useExamAutosave('att-1', questions, { loadedAttemptId: 'att-1' })
    );

    // Re-selecting already saved 'A' must not wedge activeSavePromiseRef or leave status stuck in saving
    act(() => {
      result.current.queueAnswer('q1', 'A');
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.hasPendingChanges).toBe(false);
    expect(mockedApiRequest).not.toHaveBeenCalled();

    // Selecting 'B' on q2 must dispatch PUT /answers/q2 cleanly
    act(() => {
      result.current.queueAnswer('q2', 'B');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    expect(result.current.hasPendingChanges).toBe(false);
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/ms/v1/attempts/att-1/answers/q2',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ choice: 'B' }),
      })
    );
  });

  it('C1 (Empty Queue): calling syncPending() on clean queue does not block future answers', async () => {
    const questions = [makeQuestion('q1', 1, null)];
    mockedApiRequest.mockResolvedValue(makeAttempt('att-2', 'IN_PROGRESS', questions));

    const { result } = renderHook(() =>
      useExamAutosave('att-2', questions, { loadedAttemptId: 'att-2' })
    );

    let initialSyncOk = false;
    await act(async () => {
      initialSyncOk = await result.current.syncPending();
    });
    expect(initialSyncOk).toBe(true);
    expect(mockedApiRequest).not.toHaveBeenCalled();

    act(() => {
      result.current.queueAnswer('q1', 'C');
    });

    let postSyncOk = false;
    await act(async () => {
      postSyncOk = await result.current.syncPending();
    });

    expect(postSyncOk).toBe(true);
    expect(result.current.status).toBe('saved');
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/ms/v1/attempts/att-2/answers/q1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ choice: 'C' }),
      })
    );
  });

  it('C1 (Uncertain PUT): failed PUT followed by re-selecting initial choice A requires backend confirmation', async () => {
    const questions = [makeQuestion('q1', 1, 'A')];
    const secondPutDeferred = createDeferred<AttemptView>();

    mockedApiRequest
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockImplementationOnce(() => secondPutDeferred.promise);

    const { result } = renderHook(() =>
      useExamAutosave('att-3', questions, { loadedAttemptId: 'att-3' })
    );

    // Trigger B which fails over network
    act(() => {
      result.current.queueAnswer('q1', 'B');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.hasPendingChanges).toBe(true);

    // Re-select A: must NOT assume A is still confirmed on server without PUT A succeeding
    act(() => {
      result.current.queueAnswer('q1', 'A');
    });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledTimes(2);
    });

    expect(result.current.status).toBe('saving');
    expect(result.current.hasPendingChanges).toBe(true);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      '/ms/v1/attempts/att-3/answers/q1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ choice: 'A' }),
      })
    );

    await act(async () => {
      secondPutDeferred.resolve(makeAttempt('att-3', 'IN_PROGRESS', [makeQuestion('q1', 1, 'A')]));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('C1 (Deferred Concurrency): coalesces A -> B -> C while PUT A is in flight and syncPending waits', async () => {
    const questions = [makeQuestion('q1', 1, null)];
    const firstPutDeferred = createDeferred<AttemptView>();
    const secondPutDeferred = createDeferred<AttemptView>();

    mockedApiRequest
      .mockImplementationOnce(() => firstPutDeferred.promise)
      .mockImplementationOnce(() => secondPutDeferred.promise);

    const { result } = renderHook(() =>
      useExamAutosave('att-4', questions, { loadedAttemptId: 'att-4' })
    );

    act(() => {
      result.current.queueAnswer('q1', 'A');
    });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    });

    // While PUT A is unresolved, user quickly chooses B then C
    act(() => {
      result.current.queueAnswer('q1', 'B');
      result.current.queueAnswer('q1', 'C');
    });

    let syncResolved = false;
    let syncResult = false;
    let syncPromise!: Promise<boolean>;
    act(() => {
      syncPromise = result.current.syncPending().then((res) => {
        syncResolved = true;
        syncResult = res;
        return res;
      });
    });

    // Resolve first PUT (A) -> worker must now send C (skipping B)
    await act(async () => {
      firstPutDeferred.resolve(makeAttempt('att-4', 'IN_PROGRESS', [makeQuestion('q1', 1, 'A')]));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledTimes(2);
    });

    expect(syncResolved).toBe(false);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      '/ms/v1/attempts/att-4/answers/q1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ choice: 'C' }),
      })
    );

    // Resolve second PUT (C) -> syncPending finishes with true
    await act(async () => {
      secondPutDeferred.resolve(makeAttempt('att-4', 'IN_PROGRESS', [makeQuestion('q1', 1, 'C')]));
      await syncPromise;
    });

    expect(syncResolved).toBe(true);
    expect(syncResult).toBe(true);
    expect(result.current.status).toBe('saved');
    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('Error Recovery: PUT failure keeps pending answer without infinite loop and manual retry succeeds', async () => {
    const questions = [makeQuestion('q1', 1, null)];
    mockedApiRequest
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce(makeAttempt('att-err', 'IN_PROGRESS', [makeQuestion('q1', 1, 'D')]));

    const { result } = renderHook(() =>
      useExamAutosave('att-err', questions, { loadedAttemptId: 'att-err' })
    );

    act(() => {
      result.current.queueAnswer('q1', 'D');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.errorMessage).toContain('503 Service Unavailable');

    // Wait briefly to confirm no infinite retry loop occurs
    await new Promise((r) => setTimeout(r, 25));
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);

    // Controlled manual retry syncs pending 'D'
    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect(result.current.hasPendingChanges).toBe(false);
    expect(mockedApiRequest).toHaveBeenCalledTimes(2);
  });

  it('H1 (ExamScreenPage): PUT /answers HTTP 409 triggers GET /attempts/{id} and redirects on GRADED without extra PUT/submit', async () => {
    const initialQuestions = [makeQuestion('q1', 1, null)];
    const initialAttempt = makeAttempt('att-409', 'IN_PROGRESS', initialQuestions);
    const gradedAttempt = makeAttempt('att-409', 'GRADED', [makeQuestion('q1', 1, 'A')]);
    const quizDetail: QuizDetail = {
      quiz: { id: 'quiz-1', title: 'Part 5 Practice', part: 5, premium: false, count: 1 },
      questions: [],
    };

    let attemptGetCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/attempts/att-409' && (!options || options.method === 'GET')) {
        attemptGetCount += 1;
        return attemptGetCount === 1 ? initialAttempt : gradedAttempt;
      }
      if (path === '/ms/v1/contents/quizzes/quiz-1') {
        return quizDetail;
      }
      if (path === '/ms/v1/attempts/att-409/answers/q1' && options?.method === 'PUT') {
        throw new ApiError(409, 'Already graded');
      }
      if (path === '/ms/v1/attempts/att-409/submit') {
        throw new Error('POST /submit must not be invoked after 409 GRADED verification');
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exam/att-409']}>
          <Routes>
            <Route path="/exam/:attemptId" element={<ExamScreenPage />} />
            <Route
              path="/learner/results/:attemptId"
              element={<div data-testid="graded-result-screen">Result Screen</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const optionB = await screen.findByRole('radio', { name: /Option B \(1\)/i });
    fireEvent.click(optionB);

    expect(await screen.findByTestId('graded-result-screen')).toBeInTheDocument();

    const submitCalls = mockedApiRequest.mock.calls.filter(([p]) =>
      String(p).includes('/submit')
    );
    const putCalls = mockedApiRequest.mock.calls.filter(([, opt]) => opt?.method === 'PUT');

    expect(submitCalls).toHaveLength(0);
    expect(putCalls).toHaveLength(1);
    expect(attemptGetCount).toBe(2);
  });
});
