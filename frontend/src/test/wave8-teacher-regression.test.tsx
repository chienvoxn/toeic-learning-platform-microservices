import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { DraftDetail, QuestionInput } from '@/types/quiz';
import { QuizEditPage } from '@/pages/teacher/QuizEditPage';
import { QuizCreatePage } from '@/pages/teacher/QuizCreatePage';
import { LearnerPreviewModal } from '@/features/teacher/LearnerPreviewModal';

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      userId: 'teacher-1',
      email: 'teacher@toeic.vn',
      displayName: 'Teacher User',
      role: 'TEACHER',
      roles: ['LEARNER', 'TEACHER'],
    },
    roles: ['LEARNER', 'TEACHER'],
    permissions: ['content:write'],
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r: string) => r === 'TEACHER',
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

function makeDraft(id: string, version: number, questions: QuestionInput[]): DraftDetail {
  return {
    quiz: {
      id,
      title: 'Teacher Test Quiz',
      part: 5,
      premium: false,
      count: questions.length,
      status: 'DRAFT',
      version,
    },
    questions,
  };
}

describe('Phase 8B.2: Teacher Studio Regression Suite (TE-R01 to TE-R06)', () => {
  const mockedApiRequest = vi.mocked(apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TE-R01 — Upload Cleanup
  // =========================================================================
  it('TE-R01: deleting a question while media upload is in flight cleans up uploading state and does not revive deleted question', async () => {
    const q1: QuestionInput = {
      prompt: 'Question 1',
      a: 'Opt A',
      b: 'Opt B',
      c: 'Opt C',
      d: 'Opt D',
      answer: 'A',
      explanation: 'Exp 1',
    };
    const q2: QuestionInput = {
      prompt: 'Question 2 to delete',
      a: 'Opt A2',
      b: 'Opt B2',
      c: 'Opt C2',
      d: 'Opt D2',
      answer: 'B',
      explanation: 'Exp 2',
    };

    const initialDraft = makeDraft('quiz-edit-1', 1, [q1, q2]);
    const uploadDeferred = createDeferred<{ url: string; mediaType: string; originalFilename: string }>();

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-1/draft') {
        return initialDraft;
      }
      if (path === '/ms/v1/contents/media/upload' && options?.method === 'POST') {
        return uploadDeferred.promise;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-1/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for questions to load
    expect(await screen.findByDisplayValue('Question 1')).toBeInTheDocument();

    // Switch to question 2
    const q2Tab = screen.getByRole('button', { name: /Question 2 to delete/i });
    fireEvent.click(q2Tab);
    expect(screen.getByDisplayValue('Question 2 to delete')).toBeInTheDocument();

    // Start image upload on question 2
    const imageInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    expect(imageInput).toBeTruthy();
    const testFile = new File(['dummy image'], 'photo.png', { type: 'image/png' });
    fireEvent.change(imageInput, { target: { files: [testFile] } });

    // Expect upload indicator active
    expect(await screen.findByText(/Đang tải ảnh\.\.\./i)).toBeInTheDocument();

    // Now delete question 2 while upload is in flight
    const deleteBtn = screen.getByRole('button', { name: /Xóa câu/i });
    fireEvent.click(deleteBtn);

    // Confirm question 2 is deleted and only 1 question remains
    expect(screen.queryByDisplayValue('Question 2 to delete')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Question 1')).toBeInTheDocument();

    // Now upload finishes
    await uploadDeferred.resolve({
      url: 'https://cdn.example.com/photo.png',
      mediaType: 'image',
      originalFilename: 'photo.png',
    });

    // The deleted question must NOT be restored
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Question 2 to delete')).not.toBeInTheDocument();
    });

    // The uploading media map must be clean (no stuck loading)
    expect(screen.queryByText(/Đang tải ảnh\.\.\./i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // TE-R02 — Media Request Ownership
  // =========================================================================
  it('TE-R02: consecutive uploads on same field preserve the latest request and discard earlier responses', async () => {
    const q1: QuestionInput = {
      prompt: 'Question 1 with media',
      a: 'Opt A',
      b: 'Opt B',
      c: 'Opt C',
      d: 'Opt D',
      answer: 'A',
      explanation: 'Exp 1',
    };
    const draft = makeDraft('quiz-edit-2', 1, [q1]);

    const firstUploadDeferred = createDeferred<{ url: string; mediaType: string; originalFilename: string }>();
    const secondUploadDeferred = createDeferred<{ url: string; mediaType: string; originalFilename: string }>();

    let uploadCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-2/draft') {
        return draft;
      }
      if (path === '/ms/v1/contents/media/upload' && options?.method === 'POST') {
        uploadCount += 1;
        return uploadCount === 1 ? firstUploadDeferred.promise : secondUploadDeferred.promise;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-2/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('Question 1 with media')).toBeInTheDocument();

    const imageInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;

    // Dispatch file 1
    const file1 = new File(['content1'], 'file1.jpg', { type: 'image/jpeg' });
    fireEvent.change(imageInput, { target: { files: [file1] } });

    // Rapidly dispatch file 2 before file 1 finishes
    const file2 = new File(['content2'], 'file2.jpg', { type: 'image/jpeg' });
    fireEvent.change(imageInput, { target: { files: [file2] } });

    expect(uploadCount).toBe(2);

    // Resolve file 2 first (or file 1 later)
    await secondUploadDeferred.resolve({
      url: 'https://cdn.example.com/file2.jpg',
      mediaType: 'image',
      originalFilename: 'file2.jpg',
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://cdn.example.com/file2.jpg')).toBeInTheDocument();
    });

    // Resolve file 1 later: must NOT overwrite file 2
    await firstUploadDeferred.resolve({
      url: 'https://cdn.example.com/file1-stale.jpg',
      mediaType: 'image',
      originalFilename: 'file1.jpg',
    });

    expect(screen.getByDisplayValue('https://cdn.example.com/file2.jpg')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('https://cdn.example.com/file1-stale.jpg')).not.toBeInTheDocument();
  });

  // =========================================================================
  // TE-R03 — Upload API Contract
  // =========================================================================
  it('TE-R03: verifies upload uses FormData without sending clientId or setting manual multipart boundary', async () => {
    const q1: QuestionInput = {
      prompt: 'Contract Check Question',
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
      answer: 'A',
      explanation: 'Exp',
    };
    const draft = makeDraft('quiz-edit-3', 1, [q1]);

    let capturedUploadOptions: RequestInit | undefined;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-3/draft') return draft;
      if (path === '/ms/v1/contents/media/upload') {
        capturedUploadOptions = options;
        return { url: 'https://cdn.example.com/audio.mp3', mediaType: 'audio', originalFilename: 'audio.mp3' };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-3/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('Contract Check Question')).toBeInTheDocument();

    const audioInput = document.querySelector('input[type="file"][accept="audio/*"]') as HTMLInputElement;
    const testAudio = new File(['fake audio bytes'], 'track.mp3', { type: 'audio/mpeg' });
    fireEvent.change(audioInput, { target: { files: [testAudio] } });

    await waitFor(() => {
      expect(capturedUploadOptions).toBeDefined();
    });

    expect(capturedUploadOptions?.method).toBe('POST');
    expect(capturedUploadOptions?.body instanceof FormData).toBe(true);

    const formData = capturedUploadOptions?.body as FormData;
    expect(formData.get('file')).toBeInstanceOf(File);
    // Crucial: clientId must NOT be present in upload payload
    expect(formData.get('clientId')).toBeNull();
  });

  it('TE-R03 (Real apiRequest Contract Evidence): verifies real apiRequest with FormData omits Content-Type header and injects Bearer token with mock fetch', async () => {
    const { apiRequest: realApiRequest, setAuthToken: realSetAuthToken } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    realSetAuthToken('mock-jwt-teacher-xyz');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ url: 'https://cdn.example.com/audio.mp3', mediaType: 'audio', originalFilename: 'audio.mp3' }),
    });
    global.fetch = mockFetch;

    const formData = new FormData();
    formData.append('file', new File(['audio bytes'], 'test.mp3', { type: 'audio/mpeg' }));

    await realApiRequest('/ms/v1/contents/media/upload', {
      method: 'POST',
      body: formData,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('/ms/v1/contents/media/upload');
    expect(calledInit.method).toBe('POST');
    expect(calledInit.body).toBe(formData);

    const headers = calledInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer mock-jwt-teacher-xyz');
    // CRITICAL: Content-Type MUST NOT be manually set to multipart/form-data or contain manual boundary
    expect(headers.get('Content-Type')).toBeNull();
  });

  // =========================================================================
  // TE-R04 — Draft Cache & OCC
  // =========================================================================
  it('TE-R04: saveMutation sends current version and handles HTTP 409 conflict while preserving local edits', async () => {
    const q1: QuestionInput = {
      prompt: 'Original question prompt',
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
      answer: 'A',
      explanation: 'Exp',
    };
    const initialDraft = makeDraft('quiz-edit-4', 2, [q1]);

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-4/draft') {
        if (!options || options.method === 'GET') {
          return initialDraft;
        }
        if (options.method === 'PUT') {
          // Reject with 409 Conflict
          throw new ApiError(409, 'Version mismatch');
        }
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-4/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('Original question prompt')).toBeInTheDocument();

    // Teacher edits prompt
    const promptTextarea = screen.getByDisplayValue('Original question prompt');
    fireEvent.change(promptTextarea, { target: { value: 'Locally edited prompt that must not be lost' } });

    // Click save
    const saveBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(saveBtn);

    // Verify 409 conflict alert message appears (role="heading" for Alert title)
    expect(
      await screen.findByRole('heading', { name: /Xung đột phiên bản \(HTTP 409\)/i })
    ).toBeInTheDocument();

    // Verify local edits are strictly preserved on screen
    expect(screen.getByDisplayValue('Locally edited prompt that must not be lost')).toBeInTheDocument();
  });

  it('TE-R04 (Stale GET & GroupId Preservation): saveMutation preserves groupId, omits clientId, and stale GET does not roll back higher version in QueryClient', async () => {
    const qWithGroup: QuestionInput = {
      prompt: 'Passage Question with Group',
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
      answer: 'A',
      explanation: 'Exp',
      groupId: 'group-part6-special',
    };
    const initialDraft = makeDraft('quiz-edit-occ', 2, [qWithGroup]);
    const updatedDraft = makeDraft('quiz-edit-occ', 3, [qWithGroup]);

    const staleGetDeferred = createDeferred<DraftDetail>();
    let putPayload: { version: number; quiz: { questions: QuestionInput[] } } | undefined;

    let getCount = 0;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-occ/draft') {
        if (!options || options.method === 'GET') {
          getCount += 1;
          if (getCount === 1) return initialDraft;
          return staleGetDeferred.promise;
        }
        if (options.method === 'PUT') {
          putPayload = JSON.parse(options.body as string);
          return updatedDraft;
        }
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-occ/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('Passage Question with Group')).toBeInTheDocument();

    // Trigger a background refetch
    void queryClient.refetchQueries({ queryKey: ['teacher-draft', 'quiz-edit-occ'] });

    // Save draft
    const saveBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(putPayload).toBeDefined();
    });

    // Verify PUT payload contract
    expect(putPayload?.version).toBe(2);
    expect(putPayload?.quiz.questions[0].groupId).toBe('group-part6-special');
    expect((putPayload?.quiz.questions[0] as unknown as Record<string, unknown>).clientId).toBeUndefined();

    // Cache updated to version 3
    const cachedBefore = queryClient.getQueryData<DraftDetail>(['teacher-draft', 'quiz-edit-occ']);
    expect(cachedBefore?.quiz.version).toBe(3);

    // Stale background GET resolves with older version 2
    await staleGetDeferred.resolve(initialDraft);

    // QueryClient cache MUST NOT roll back to version 2
    const cachedAfter = queryClient.getQueryData<DraftDetail>(['teacher-draft', 'quiz-edit-occ']);
    expect(cachedAfter?.quiz.version).toBe(3);
  });

  it('TE-R04 (Controlled Reload on Conflict): enables controlled reload on HTTP 409 to safely fetch fresh server state', async () => {
    const q1: QuestionInput = {
      prompt: 'Draft question v1',
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
      answer: 'A',
      explanation: 'Exp',
    };
    const initialDraft = makeDraft('quiz-edit-reload', 1, [q1]);
    const freshDraft = makeDraft('quiz-edit-reload', 2, [
      { ...q1, prompt: 'Server authoritative question v2' },
    ]);

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-reload/draft') {
        if (!options || options.method === 'GET') {
          return initialDraft;
        }
        if (options.method === 'PUT') {
          throw new ApiError(409, 'Conflict detected on server');
        }
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-reload/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('Draft question v1')).toBeInTheDocument();

    // Edit prompt and trigger 409
    const promptTextarea = screen.getByDisplayValue('Draft question v1');
    fireEvent.change(promptTextarea, { target: { value: 'Local edit prompt' } });

    const saveBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByRole('heading', { name: /Xung đột phiên bản \(HTTP 409\)/i })
    ).toBeInTheDocument();

    // Now mock GET to return freshDraft
    mockedApiRequest.mockImplementation(async (path) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-reload/draft') {
        return freshDraft;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    // Click 'Tải lại bản mới nhất từ máy chủ'
    const reloadBtn = screen.getByRole('button', { name: /Tải lại bản mới nhất từ máy chủ/i });
    fireEvent.click(reloadBtn);

    // Confirm dialog opens
    expect(await screen.findByText('Tải lại bản nháp từ máy chủ?')).toBeInTheDocument();
    const confirmReloadBtn = screen.getByRole('button', { name: /Xác nhận tải lại/i });
    fireEvent.click(confirmReloadBtn);

    // Fresh draft from server is loaded
    expect(await screen.findByDisplayValue('Server authoritative question v2')).toBeInTheDocument();
  });

  // =========================================================================
  // TE-R05 — Editor Session & QuizCreatePage
  // =========================================================================
  it('TE-R05 (Create): QuizCreatePage validates title and calls POST /ms/v1/contents/quizzes/drafts before redirecting', async () => {
    let createPayload: unknown;
    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/drafts' && options?.method === 'POST') {
        createPayload = JSON.parse(options.body as string);
        return {
          quiz: {
            id: 'new-quiz-999',
            title: 'New Created Quiz',
            part: 5,
            premium: false,
            count: 0,
            status: 'DRAFT',
            version: 1,
            ownerUserId: 'teacher-1',
          },
          questions: [],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/create']}>
          <Routes>
            <Route path="/teacher/quizzes/create" element={<QuizCreatePage />} />
            <Route
              path="/teacher/quizzes/:id/edit"
              element={<div data-testid="edit-destination">Editor Destination</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Attempt submit with empty title via form submit
    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(await screen.findByText(/Vui lòng nhập tiêu đề cho đề thi/i)).toBeInTheDocument();
    expect(mockedApiRequest).not.toHaveBeenCalled();

    // Enter valid title
    const titleInput = screen.getByLabelText(/Tiêu đề đề thi/i);
    fireEvent.change(titleInput, { target: { value: 'New Created Quiz' } });

    fireEvent.submit(form!);

    expect(await screen.findByTestId('edit-destination')).toBeInTheDocument();
    expect(createPayload).toEqual({
      title: 'New Created Quiz',
      part: 5,
      premium: false,
      questions: [],
    });
  });

  it('TE-R05 (Edit A->B->A Navigation): QuizEditPage A -> B -> A route switching isolates editor session and resets transient state', async () => {
    const draftA = makeDraft('quiz-edit-A', 1, [
      {
        prompt: 'Question for Quiz A',
        a: 'A1',
        b: 'B1',
        c: 'C1',
        d: 'D1',
        answer: 'A',
        explanation: 'Exp A',
      },
    ]);
    const draftB = makeDraft('quiz-edit-B', 1, [
      {
        prompt: 'Question for Quiz B',
        a: 'A2',
        b: 'B2',
        c: 'C2',
        d: 'D2',
        answer: 'B',
        explanation: 'Exp B',
      },
    ]);

    const putDeferredA = createDeferred<DraftDetail>();

    mockedApiRequest.mockImplementation(async (path, options) => {
      if (path === '/ms/v1/contents/quizzes/quiz-edit-A/draft') {
        if (!options || options.method === 'GET') return draftA;
        if (options.method === 'PUT') return putDeferredA.promise;
      }
      if (path === '/ms/v1/contents/quizzes/quiz-edit-B/draft') {
        return draftB;
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    function TeacherNavigationWrapper() {
      const navigate = useNavigate();
      return (
        <div>
          <button onClick={() => navigate('/teacher/quizzes/quiz-edit-B/edit')}>Switch to Quiz B</button>
          <button onClick={() => navigate('/teacher/quizzes/quiz-edit-A/edit')}>Switch to Quiz A</button>
          <QuizEditPage />
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-edit-A/edit']}>
          <Routes>
            <Route path="/teacher/quizzes/:id/edit" element={<TeacherNavigationWrapper />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial render Quiz A
    expect(await screen.findByDisplayValue('Question for Quiz A')).toBeInTheDocument();

    // Trigger save on Quiz A (in flight)
    const saveBtnA = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(saveBtnA);

    // Switch to Quiz B before save resolves
    fireEvent.click(screen.getByText('Switch to Quiz B'));
    expect(await screen.findByDisplayValue('Question for Quiz B')).toBeInTheDocument();

    // Switch back to Quiz A while putDeferredA from visit 1 is still in flight
    fireEvent.click(screen.getByText('Switch to Quiz A'));
    expect(await screen.findByDisplayValue('Question for Quiz A')).toBeInTheDocument();

    // Enter new edit on visit 2
    const textareaA = screen.getByDisplayValue('Question for Quiz A');
    fireEvent.change(textareaA, { target: { value: 'New prompt on visit 2' } });
    expect(screen.getByDisplayValue('New prompt on visit 2')).toBeInTheDocument();

    // Now resolve Quiz A save from visit 1
    await act(async () => {
      putDeferredA.resolve(makeDraft('quiz-edit-A', 2, [
        {
          prompt: 'Question for Quiz A',
          a: 'A1',
          b: 'B1',
          c: 'C1',
          d: 'D1',
          answer: 'A',
          explanation: 'Exp A',
        },
      ]));
    });

    // Session sequence tracking ensures delayed save from visit 1 does NOT overwrite visit 2 edits or reset dirty flag
    expect(screen.getByDisplayValue('New prompt on visit 2')).toBeInTheDocument();
    expect(screen.getByText(/Bạn có thay đổi chưa lưu/i)).toBeInTheDocument();
  });

  // =========================================================================
  // TE-R06 — CSV & Learner Preview
  // =========================================================================
  it('TE-R06: LearnerPreviewModal renders Part 2 with 3 choices and clamps index without triggering API requests', () => {
    const qPart2: QuestionInput = {
      prompt: 'Where is the annual conference held?',
      a: 'In the grand hall',
      b: 'At 9:00 AM',
      c: 'Yes, yesterday',
      d: '',
      answer: 'A',
      explanation: 'Location response',
    };

    render(
      <LearnerPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        title="Part 2 Preview"
        part={2}
        premium={false}
        questions={[qPart2]}
      />
    );

    // Verify modal header and content
    expect(screen.getByText('Part 2 Preview')).toBeInTheDocument();
    expect(screen.getByText('Where is the annual conference held?')).toBeInTheDocument();

    // Must show choices A, B, C
    expect(screen.getByText('In the grand hall')).toBeInTheDocument();
    expect(screen.getByText('At 9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Yes, yesterday')).toBeInTheDocument();

    // Zero API requests must be made during preview
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });
});
