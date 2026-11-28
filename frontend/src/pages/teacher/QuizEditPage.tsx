import { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import {
  useParams,
  useNavigate,
  useBlocker,
  UNSAFE_DataRouterStateContext,
} from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { DraftDetail, QuestionInput, OwnedQuiz, MediaUploadResponse } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Badge } from '@/components/atoms/Badge';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { Alert } from '@/components/molecules/Alert';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { CsvImportModal } from '@/features/teacher/CsvImportModal';
import { LearnerPreviewModal } from '@/features/teacher/LearnerPreviewModal';
import { cn } from '@/lib/utils';
import {
  Save,
  Send,
  Plus,
  Trash2,
  UploadCloud,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Eye,
  Headphones,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

interface QuestionItem {
  clientId: string;
  data: QuestionInput;
}

type MediaField = 'audioUrl' | 'imageUrl';

let clientIdCounter = 0;
function createClientId(): string {
  clientIdCounter += 1;
  return `q-client-${clientIdCounter}`;
}

function getMediaKey(clientId: string, field: MediaField): string {
  return `${clientId}:${field}`;
}

function stripQuestionClientIds(items: QuestionItem[]): QuestionInput[] {
  return items.map((item) => ({
    prompt: item.data.prompt,
    a: item.data.a,
    b: item.data.b,
    c: item.data.c,
    d: item.data.d,
    answer: item.data.answer,
    explanation: item.data.explanation,
    ...(item.data.passageText !== undefined ? { passageText: item.data.passageText } : {}),
    ...(item.data.audioUrl !== undefined ? { audioUrl: item.data.audioUrl } : {}),
    ...(item.data.imageUrl !== undefined ? { imageUrl: item.data.imageUrl } : {}),
    ...(item.data.groupId !== undefined ? { groupId: item.data.groupId } : {}),
  }));
}

function formatMediaUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
    }
    if (err.status === 403) {
      return 'Không có quyền tải tệp.';
    }
    if (err.status === 413) {
      // Verified in QuizController.java (20MB limit) and gateway/nginx.conf (client_max_body_size 25m)
      return 'Tệp vượt quá dung lượng cho phép (tối đa 20MB).';
    }
    const cleanMsg = err.message.trim();
    if (cleanMsg.startsWith('<') || cleanMsg.toLowerCase().includes('<html')) {
      return `Tải tệp lên thất bại (HTTP ${err.status}).`;
    }
    return cleanMsg || `Tải tệp lên thất bại (HTTP ${err.status}).`;
  }
  if (err instanceof TypeError) {
    return 'Không thể kết nối để tải tệp.';
  }
  if (err instanceof Error) {
    const cleanMsg = err.message.trim();
    if (cleanMsg.toLowerCase().includes('failed to fetch') || cleanMsg.toLowerCase().includes('network')) {
      return 'Không thể kết nối để tải tệp.';
    }
    if (cleanMsg.startsWith('<') || cleanMsg.toLowerCase().includes('<html')) {
      return 'Tải tệp lên thất bại do lỗi phản hồi từ máy chủ.';
    }
    return cleanMsg;
  }
  return 'Tải tệp lên thất bại.';
}

function DataRouterNavigationBlocker({ shouldBlock }: { shouldBlock: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  );

  return (
    <ConfirmDialog
      isOpen={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      title="Rời khỏi trình biên soạn?"
      description="Bạn đang có thay đổi chưa lưu trong bản nháp. Nếu rời khỏi trang lúc này, các chỉnh sửa chưa lưu sẽ bị mất."
      confirmText="Rời khỏi trang"
      cancelText="Ở lại biên soạn"
      variant="destructive"
    />
  );
}

export function QuizEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasDataRouter = Boolean(useContext(UNSAFE_DataRouterStateContext));

  // Local draft form state
  const [title, setTitle] = useState('');
  const [part, setPart] = useState(5);
  const [premium, setPremium] = useState(false);
  const [questionItems, setQuestionItems] = useState<QuestionItem[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [currentVersion, setCurrentVersion] = useState<number>(0);

  // Status & Feedback state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReloadConfirmOpen, setIsReloadConfirmOpen] = useState(false);
  const [isReloadingFromServer, setIsReloadingFromServer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Per-(clientId, mediaField) upload tracking
  const [uploadingMediaMap, setUploadingMediaMap] = useState<Record<string, boolean>>({});
  const [mediaErrorMap, setMediaErrorMap] = useState<Record<string, string | null>>({});
  const [mediaSuccessMap, setMediaSuccessMap] = useState<Record<string, string | null>>({});

  // Lifecycle & concurrency refs
  const isMountedRef = useRef(true);
  const activeQuizIdRef = useRef<string | undefined>(id);
  const initializedQuizIdRef = useRef<string | null>(null);
  const currentVersionRef = useRef<number>(0);
  const editRevisionRef = useRef<number>(0);
  const isPublishRedirectingRef = useRef(false);
  const questionClientIdsRef = useRef<Set<string>>(new Set());
  const uploadReqSeqRef = useRef(0);
  const latestMediaReqRef = useRef<Record<string, number>>({});
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const resetAllMediaUploadStates = useCallback(() => {
    uploadReqSeqRef.current += 1;
    latestMediaReqRef.current = {};
    setUploadingMediaMap({});
    setMediaErrorMap({});
    setMediaSuccessMap({});
  }, []);

  const clearMediaStateForClientId = useCallback((clientId: string) => {
    const audioKey = getMediaKey(clientId, 'audioUrl');
    const imageKey = getMediaKey(clientId, 'imageUrl');

    uploadReqSeqRef.current += 1;
    latestMediaReqRef.current[audioKey] = uploadReqSeqRef.current;
    uploadReqSeqRef.current += 1;
    latestMediaReqRef.current[imageKey] = uploadReqSeqRef.current;

    setUploadingMediaMap((prev) => {
      if (!(audioKey in prev) && !(imageKey in prev)) return prev;
      const next = { ...prev };
      delete next[audioKey];
      delete next[imageKey];
      return next;
    });
    setMediaErrorMap((prev) => {
      if (!(audioKey in prev) && !(imageKey in prev)) return prev;
      const next = { ...prev };
      delete next[audioKey];
      delete next[imageKey];
      return next;
    });
    setMediaSuccessMap((prev) => {
      if (!(audioKey in prev) && !(imageKey in prev)) return prev;
      const next = { ...prev };
      delete next[audioKey];
      delete next[imageKey];
      return next;
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      uploadReqSeqRef.current += 1;
      latestMediaReqRef.current = {};
    };
  }, []);

  // Reset all transient editor state when route quiz ID changes
  useEffect(() => {
    activeQuizIdRef.current = id;
    initializedQuizIdRef.current = null;
    currentVersionRef.current = 0;
    editRevisionRef.current = 0;
    isPublishRedirectingRef.current = false;
    questionClientIdsRef.current = new Set();

    setTitle('');
    setPart(5);
    setPremium(false);
    setQuestionItems([]);
    setActiveQuestionIdx(0);
    setCurrentVersion(0);
    setHasUnsavedChanges(false);
    setIsCsvModalOpen(false);
    setIsPreviewModalOpen(false);
    setIsReloadConfirmOpen(false);
    setIsReloadingFromServer(false);
    setSaveSuccess(null);
    setErrorMessage(null);
    setConflictError(null);
    resetAllMediaUploadStates();
  }, [id, resetAllMediaUploadStates]);

  const questions = useMemo(() => stripQuestionClientIds(questionItems), [questionItems]);

  const hydrateDraftState = useCallback(
    (detail: DraftDetail) => {
      const hydratedItems = (detail.questions || []).map((q) => ({
        clientId: createClientId(),
        data: q,
      }));
      initializedQuizIdRef.current = detail.quiz.id;
      currentVersionRef.current = detail.quiz.version;
      questionClientIdsRef.current = new Set(hydratedItems.map((item) => item.clientId));
      editRevisionRef.current += 1;

      setTitle(detail.quiz.title);
      setPart(detail.quiz.part);
      setPremium(detail.quiz.premium);
      setQuestionItems(hydratedItems);
      setActiveQuestionIdx((prev) =>
        hydratedItems.length === 0 ? 0 : Math.min(prev, hydratedItems.length - 1)
      );
      setCurrentVersion(detail.quiz.version);
      setHasUnsavedChanges(false);
      setConflictError(null);
      setErrorMessage(null);
      resetAllMediaUploadStates();
    },
    [resetAllMediaUploadStates]
  );

  // 1. Fetch Draft Details from Content Service
  const {
    data: draftData,
    isLoading,
    isError,
  } = useQuery<DraftDetail>({
    queryKey: ['teacher-draft', id],
    queryFn: () => apiRequest<DraftDetail>(`/ms/v1/contents/quizzes/${id}/draft`),
    enabled: Boolean(id),
    staleTime: 0,
  });

  // Initial hydration for current quiz ID ONLY; background refetch never silently overwrites editor state
  useEffect(() => {
    if (!draftData || !id || draftData.quiz.id !== id) return;

    if (initializedQuizIdRef.current !== id) {
      hydrateDraftState(draftData);
      return;
    }

    if (draftData.quiz.version > currentVersionRef.current) {
      setConflictError(
        `Phát hiện phiên bản mới hơn từ máy chủ (v${draftData.quiz.version} so với v${currentVersionRef.current} đang mở). Dữ liệu bạn đang soạn vẫn được giữ nguyên trên màn hình.`
      );
    }
  }, [draftData, id, hydrateDraftState]);

  // Window unload protection for browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isPublishRedirectingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const isAnyMediaUploading = useMemo(
    () => Object.values(uploadingMediaMap).some(Boolean),
    [uploadingMediaMap]
  );

  // 2. Save Draft Mutation (PUT /ms/v1/contents/quizzes/{id}/draft)
  const saveMutation = useMutation({
    onMutate: async () => {
      const targetQuizId = id;
      const revisionAtStart = editRevisionRef.current;
      if (targetQuizId) {
        await queryClient.cancelQueries({ queryKey: ['teacher-draft', targetQuizId] });
      }
      return { targetQuizId, revisionAtStart };
    },
    mutationFn: async () => {
      const targetQuizId = id;
      return apiRequest<DraftDetail>(`/ms/v1/contents/quizzes/${targetQuizId}/draft`, {
        method: 'PUT',
        body: JSON.stringify({
          version: currentVersionRef.current,
          quiz: {
            title: title.trim(),
            part,
            premium,
            questions: stripQuestionClientIds(questionItems),
          },
        }),
      });
    },
    onSuccess: (updated, _variables, context) => {
      const targetQuizId = context?.targetQuizId;
      if (!targetQuizId) return;

      queryClient.setQueryData<DraftDetail>(['teacher-draft', targetQuizId], (old) =>
        !old || updated.quiz.version >= old.quiz.version ? updated : old
      );
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });

      if (!isMountedRef.current || activeQuizIdRef.current !== targetQuizId) return;

      currentVersionRef.current = updated.quiz.version;
      setCurrentVersion(updated.quiz.version);

      if (editRevisionRef.current === context?.revisionAtStart) {
        setHasUnsavedChanges(false);
      }

      setConflictError(null);
      setErrorMessage(null);
      setSaveSuccess(`Đã lưu bản nháp thành công (Phiên bản v${updated.quiz.version}).`);
    },
    onError: (err: unknown, _variables, context) => {
      if (!isMountedRef.current || activeQuizIdRef.current !== context?.targetQuizId) return;
      setSaveSuccess(null);
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu bản nháp.';
      const isConflict =
        (err instanceof ApiError && err.isConflict()) ||
        msg.includes('409') ||
        msg.toLowerCase().includes('conflict');

      if (isConflict) {
        setConflictError(
          'Đã xảy ra xung đột phiên bản (HTTP 409). Đề thi đã được cập nhật ở nơi khác hoặc đã chuyển trạng thái. Dữ liệu bạn đang soạn vẫn được giữ nguyên trên màn hình.'
        );
      } else {
        setErrorMessage(msg);
      }
    },
  });

  // 3. Publish Mutation (POST /ms/v1/contents/quizzes/{id}/publish)
  const publishMutation = useMutation({
    onMutate: () => {
      return { targetQuizId: id };
    },
    mutationFn: async () => {
      return apiRequest<OwnedQuiz>(`/ms/v1/contents/quizzes/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ version: currentVersionRef.current }),
      });
    },
    onSuccess: (_data, _variables, context) => {
      const targetQuizId = context?.targetQuizId;
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['public-quizzes'] });

      if (!isMountedRef.current || activeQuizIdRef.current !== targetQuizId) return;

      isPublishRedirectingRef.current = true;
      setHasUnsavedChanges(false);
      navigate('/teacher/quizzes', { replace: true });
    },
    onError: (err: unknown, _variables, context) => {
      if (!isMountedRef.current || activeQuizIdRef.current !== context?.targetQuizId) return;
      const msg = err instanceof Error ? err.message : 'Xuất bản đề thi thất bại.';
      const isConflict =
        (err instanceof ApiError && err.isConflict()) ||
        msg.includes('409') ||
        msg.toLowerCase().includes('conflict');

      if (isConflict) {
        setConflictError(
          'Xung đột phiên bản khi xuất bản (HTTP 409). Vui lòng tải lại dữ liệu mới nhất hoặc lưu bản nháp trước khi xuất bản.'
        );
      } else {
        setErrorMessage(msg);
      }
    },
  });

  const isMutating = saveMutation.isPending || publishMutation.isPending || isReloadingFromServer;

  const executeReloadFromServer = async () => {
    const targetQuizId = id;
    if (!targetQuizId || saveMutation.isPending || publishMutation.isPending) return;

    setIsReloadConfirmOpen(false);
    setIsReloadingFromServer(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      await queryClient.cancelQueries({ queryKey: ['teacher-draft', targetQuizId] });
      const freshDraft = await apiRequest<DraftDetail>(`/ms/v1/contents/quizzes/${targetQuizId}/draft`);
      if (!isMountedRef.current || activeQuizIdRef.current !== targetQuizId) return;

      queryClient.setQueryData(['teacher-draft', targetQuizId], freshDraft);
      hydrateDraftState(freshDraft);
      setSaveSuccess(`Đã tải lại bản mới nhất từ máy chủ (Phiên bản v${freshDraft.quiz.version}).`);
    } catch (err: unknown) {
      if (!isMountedRef.current || activeQuizIdRef.current !== targetQuizId) return;
      const msg = err instanceof Error ? err.message : 'Không thể tải lại bản nháp từ máy chủ.';
      setErrorMessage(msg);
    } finally {
      if (isMountedRef.current && activeQuizIdRef.current === targetQuizId) {
        setIsReloadingFromServer(false);
      }
    }
  };

  const handleRequestReloadFromServer = () => {
    if (isMutating) return;
    if (hasUnsavedChanges) {
      setIsReloadConfirmOpen(true);
      return;
    }
    void executeReloadFromServer();
  };

  // Question & metadata editing helpers (all guarded by isMutating)
  const markDirty = useCallback(() => {
    editRevisionRef.current += 1;
    setHasUnsavedChanges(true);
  }, []);

  const updateQuestionFieldByClientId = useCallback(
    (targetClientId: string, field: keyof QuestionInput, val: string) => {
      if (isMutating) return;

      // Invalidate pending media upload for this exact (question, field) when teacher edits URL manually
      if (field === 'audioUrl' || field === 'imageUrl') {
        const mediaKey = getMediaKey(targetClientId, field);
        uploadReqSeqRef.current += 1;
        latestMediaReqRef.current[mediaKey] = uploadReqSeqRef.current;
        setUploadingMediaMap((prev) => {
          if (!(mediaKey in prev)) return prev;
          const next = { ...prev };
          delete next[mediaKey];
          return next;
        });
        setMediaErrorMap((prev) => {
          if (!(mediaKey in prev)) return prev;
          const next = { ...prev };
          delete next[mediaKey];
          return next;
        });
        setMediaSuccessMap((prev) => {
          if (!(mediaKey in prev)) return prev;
          const next = { ...prev };
          delete next[mediaKey];
          return next;
        });
      }

      setQuestionItems((prev) =>
        prev.map((item) =>
          item.clientId === targetClientId
            ? {
                ...item,
                data: {
                  ...item.data,
                  [field]: val,
                },
              }
            : item
        )
      );
      markDirty();
    },
    [isMutating, markDirty]
  );

  const handleUpdateActiveQuestion = useCallback(
    (field: keyof QuestionInput, val: string) => {
      if (isMutating) return;
      const activeItem = questionItems[activeQuestionIdx];
      if (!activeItem) return;
      updateQuestionFieldByClientId(activeItem.clientId, field, val);
    },
    [isMutating, questionItems, activeQuestionIdx, updateQuestionFieldByClientId]
  );

  const handleMediaUpload = async (field: MediaField, targetClientId: string, file: File) => {
    const requestQuizId = id;
    if (isMutating || !requestQuizId) return;

    const mediaKey = getMediaKey(targetClientId, field);
    uploadReqSeqRef.current += 1;
    const reqId = uploadReqSeqRef.current;
    latestMediaReqRef.current[mediaKey] = reqId;

    setUploadingMediaMap((prev) => ({ ...prev, [mediaKey]: true }));
    setMediaErrorMap((prev) => {
      if (!(mediaKey in prev)) return prev;
      const next = { ...prev };
      delete next[mediaKey];
      return next;
    });
    setMediaSuccessMap((prev) => {
      if (!(mediaKey in prev)) return prev;
      const next = { ...prev };
      delete next[mediaKey];
      return next;
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploaded = await apiRequest<MediaUploadResponse>('/ms/v1/contents/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (
        !isMountedRef.current ||
        activeQuizIdRef.current !== requestQuizId ||
        latestMediaReqRef.current[mediaKey] !== reqId ||
        !questionClientIdsRef.current.has(targetClientId)
      ) {
        return;
      }

      setQuestionItems((prev) =>
        prev.map((item) =>
          item.clientId === targetClientId
            ? {
                ...item,
                data: {
                  ...item.data,
                  [field]: uploaded.url,
                },
              }
            : item
        )
      );

      markDirty();
      setMediaSuccessMap((prev) => ({
        ...prev,
        [mediaKey]: `Đã tải lên thành công (${uploaded.mediaType.toUpperCase()}).`,
      }));
    } catch (err: unknown) {
      if (
        !isMountedRef.current ||
        activeQuizIdRef.current !== requestQuizId ||
        latestMediaReqRef.current[mediaKey] !== reqId
      ) {
        return;
      }
      setMediaErrorMap((prev) => ({ ...prev, [mediaKey]: formatMediaUploadError(err) }));
    } finally {
      if (
        isMountedRef.current &&
        activeQuizIdRef.current === requestQuizId &&
        latestMediaReqRef.current[mediaKey] === reqId
      ) {
        setUploadingMediaMap((prev) => {
          const next = { ...prev };
          delete next[mediaKey];
          return next;
        });
      }
    }
  };

  const handleAddQuestion = () => {
    if (isMutating) return;
    const newItem: QuestionItem = {
      clientId: createClientId(),
      data: {
        prompt: '',
        a: '',
        b: '',
        c: '',
        d: '',
        answer: 'A',
        explanation: '',
      },
    };
    const nextIdx = questionItems.length;
    questionClientIdsRef.current.add(newItem.clientId);
    setQuestionItems((prev) => [...prev, newItem]);
    setActiveQuestionIdx(nextIdx);
    markDirty();
  };

  const handleRemoveQuestion = (idx: number) => {
    if (isMutating) return;
    if (questionItems.length <= 1) {
      setErrorMessage('Đề thi cần có tối thiểu 1 câu hỏi trong danh sách.');
      return;
    }
    const targetItem = questionItems[idx];
    if (targetItem) {
      questionClientIdsRef.current.delete(targetItem.clientId);
      clearMediaStateForClientId(targetItem.clientId);
    }
    const next = questionItems.filter((_, i) => i !== idx);
    setQuestionItems(next);
    setActiveQuestionIdx(Math.max(0, Math.min(idx, next.length - 1)));
    markDirty();
    setErrorMessage(null);
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (isMutating) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questionItems.length) return;

    setQuestionItems((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setActiveQuestionIdx(targetIdx);
    markDirty();
  };

  const handleImportCsvQuestions = (imported: QuestionInput[]) => {
    if (isMutating) return;
    const importedItems: QuestionItem[] = imported.map((q) => ({
      clientId: createClientId(),
      data: q,
    }));
    importedItems.forEach((item) => questionClientIdsRef.current.add(item.clientId));
    setQuestionItems((prev) => [...prev, ...importedItems]);
    markDirty();
    setSaveSuccess(`Đã nhập thành công ${imported.length} câu hỏi từ tệp CSV vào bản nháp.`);
    setErrorMessage(null);
  };

  // Publish validation check (keep business rules intact)
  const publishValidation = useMemo(() => {
    if (!title.trim()) return 'Tiêu đề đề thi không được để trống.';
    if (questions.length === 0) return 'Đề thi phải có ít nhất 1 câu hỏi để xuất bản.';

    const isPart2 = part === 2;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Câu #${i + 1}: Nội dung câu hỏi còn trống.`;
      if (!q.a.trim() || !q.b.trim() || !q.c.trim() || (!isPart2 && !q.d?.trim()))
        return `Câu #${i + 1}: Các lựa chọn ${isPart2 ? 'A, B, C' : 'A, B, C, D'} không được để trống.`;
      if (!q.answer || (isPart2 ? !['A', 'B', 'C'].includes(q.answer) : !['A', 'B', 'C', 'D'].includes(q.answer)))
        return `Câu #${i + 1}: Chưa chọn đáp án đúng (${isPart2 ? 'A, B, hoặc C' : 'A, B, C, hoặc D'}).`;
      if (!q.explanation.trim()) return `Câu #${i + 1}: Lời giải thích không được để trống khi xuất bản.`;
      if (part >= 1 && part <= 4 && !q.audioUrl?.trim()) {
        return `Câu #${i + 1}: Phần thi Listening (Part ${part}) cần có đường dẫn Audio hợp lệ.`;
      }
      if (part === 1 && !q.imageUrl?.trim()) {
        return `Câu #${i + 1}: Part 1 Photographs cần có hình ảnh minh họa.`;
      }
    }
    return null;
  }, [title, questions, part]);

  const completedQuestionsCount = useMemo(() => {
    return questions.filter((q) => {
      const hasChoices =
        q.prompt.trim() && q.a.trim() && q.b.trim() && q.c.trim() && (part === 2 || Boolean(q.d?.trim()));
      const hasAnswer = part === 2 ? ['A', 'B', 'C'].includes(q.answer) : ['A', 'B', 'C', 'D'].includes(q.answer);
      const hasExplanation = Boolean(q.explanation.trim());
      const hasAudio = part >= 1 && part <= 4 ? Boolean(q.audioUrl?.trim()) : true;
      const hasImage = part === 1 ? Boolean(q.imageUrl?.trim()) : true;
      return Boolean(hasChoices && hasAnswer && hasExplanation && hasAudio && hasImage);
    }).length;
  }, [questions, part]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SkeletonLoader className="lg:col-span-4 h-96 rounded-lg" />
          <SkeletonLoader className="lg:col-span-8 h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !draftData) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Không tìm thấy bản nháp đề thi"
        description="Đề thi này có thể đã được xuất bản (chuyển sang chế độ chỉ đọc) hoặc bạn không có quyền sở hữu."
        actionText="Về kho đề thi của tôi"
        onAction={() => navigate('/teacher/quizzes')}
      />
    );
  }

  const activeItem = questionItems[activeQuestionIdx];
  const activeQuestion = activeItem?.data;
  const audioKey = activeItem ? getMediaKey(activeItem.clientId, 'audioUrl') : '';
  const imageKey = activeItem ? getMediaKey(activeItem.clientId, 'imageUrl') : '';
  const isUploadingAudio = audioKey ? Boolean(uploadingMediaMap[audioKey]) : false;
  const isUploadingImage = imageKey ? Boolean(uploadingMediaMap[imageKey]) : false;
  const audioUploadError = audioKey ? mediaErrorMap[audioKey] : null;
  const imageUploadError = imageKey ? mediaErrorMap[imageKey] : null;
  const audioUploadSuccess = audioKey ? mediaSuccessMap[audioKey] : null;
  const imageUploadSuccess = imageKey ? mediaSuccessMap[imageKey] : null;

  return (
    <div className="space-y-6">
      {hasDataRouter && (
        <DataRouterNavigationBlocker shouldBlock={hasUnsavedChanges && !isPublishRedirectingRef.current} />
      )}

      {/* Top Authoring Command Bar */}
      <Card variant="default" className="p-4 sm:p-5 border-l-8 border-l-secondary space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/teacher/quizzes')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Danh sách
            </Button>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-foreground truncate max-w-md tracking-tight">
                  {title || 'Đề thi chưa đặt tiêu đề'}
                </h1>
                <StatusBadge status="DRAFT" />
                <Badge variant="outline" className="font-mono text-[11px]">
                  v{currentVersion}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  Part {part}
                </Badge>
                <Badge variant={premium ? 'pro' : 'outline'} className="text-[11px]">
                  {premium ? 'PRO' : 'FREE'}
                </Badge>
                {hasUnsavedChanges ? (
                  <Badge variant="warning" className="text-[11px]">
                    Chưa lưu thay đổi
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[11px]">
                    Đã đồng bộ
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                Tổng cộng <span className="font-mono font-bold text-foreground">{questions.length}</span> câu hỏi • Hoàn chỉnh{' '}
                <span className="font-mono font-bold text-foreground">
                  {completedQuestionsCount}/{questions.length}
                </span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
            >
              <Eye className="h-3.5 w-3.5" /> Xem trước
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCsvModalOpen(true)}
              disabled={isMutating}
            >
              <UploadCloud className="h-3.5 w-3.5" /> Nhập CSV
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!isMutating && !isAnyMediaUploading) saveMutation.mutate();
              }}
              isLoading={saveMutation.isPending}
              disabled={isMutating || isAnyMediaUploading}
            >
              <Save className="h-3.5 w-3.5" />
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu nháp'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!isMutating && !isAnyMediaUploading && !publishValidation && !hasUnsavedChanges) {
                  publishMutation.mutate();
                }
              }}
              isLoading={publishMutation.isPending}
              disabled={
                isMutating ||
                isAnyMediaUploading ||
                Boolean(publishValidation) ||
                hasUnsavedChanges
              }
              title={
                hasUnsavedChanges
                  ? 'Hãy lưu bản nháp trước khi xuất bản'
                  : publishValidation || 'Xuất bản đề thi'
              }
            >
              <Send className="h-3.5 w-3.5" />
              {publishMutation.isPending ? 'Đang xuất bản...' : 'Xuất bản'}
            </Button>
          </div>
        </div>

        {/* Publish Readiness Hint */}
        {(hasUnsavedChanges || publishValidation) && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-ink-muted">
            <AlertTriangle className="h-4 w-4 text-foreground shrink-0" />
            <span>
              {hasUnsavedChanges
                ? 'Bạn có thay đổi chưa lưu. Vui lòng bấm "Lưu nháp" trước khi xuất bản đề thi.'
                : `Điều kiện xuất bản: ${publishValidation}`}
            </span>
          </div>
        )}
      </Card>

      {/* Feedback Alerts */}
      {conflictError && (
        <Alert type="error" title="Xung đột phiên bản (HTTP 409)">
          <div className="space-y-2">
            <p>{conflictError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestReloadFromServer}
              isLoading={isReloadingFromServer}
              disabled={isMutating}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tải lại bản mới nhất từ máy chủ
            </Button>
          </div>
        </Alert>
      )}

      {errorMessage && (
        <Alert type="error" title="Lỗi thực hiện">
          {errorMessage}
        </Alert>
      )}

      {saveSuccess && (
        <Alert type="success" title="Thông báo biên soạn">
          {saveSuccess}
        </Alert>
      )}

      {/* Main Studio Workspace: 2 Columns (Desktop side-by-side, Mobile vertical) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols): Quiz Config + Question Navigator */}
        <div className="lg:col-span-4 space-y-5">
          {/* General Metadata Settings */}
          <Card variant="flat" className="p-4 space-y-4">
            <h2 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/20 pb-2">
              Cấu hình đề thi
            </h2>
            <Input
              label="Tiêu đề đề thi"
              value={title}
              disabled={isMutating}
              onChange={(e) => {
                if (isMutating) return;
                setTitle(e.target.value);
                markDirty();
              }}
              placeholder="Nhập tiêu đề đề thi..."
              maxLength={255}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Phần thi"
                value={String(part)}
                disabled={isMutating}
                onChange={(e) => {
                  if (isMutating) return;
                  setPart(Number(e.target.value));
                  markDirty();
                }}
                options={[1, 2, 3, 4, 5, 6, 7].map((p) => ({
                  value: String(p),
                  label: `Part ${p}`,
                }))}
              />

              <Select
                label="Gói áp dụng"
                value={premium ? 'PRO' : 'FREE'}
                disabled={isMutating}
                onChange={(e) => {
                  if (isMutating) return;
                  setPremium(e.target.value === 'PRO');
                  markDirty();
                }}
                options={[
                  { value: 'FREE', label: 'FREE (Miễn phí)' },
                  { value: 'PRO', label: 'PRO (Hội viên)' },
                ]}
              />
            </div>
          </Card>

          {/* Question List Navigator */}
          <Card variant="flat" className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2">
              <h2 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Danh sách câu hỏi ({questions.length})
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddQuestion}
                disabled={isMutating}
              >
                <Plus className="h-3.5 w-3.5" /> Thêm câu
              </Button>
            </div>

            {questionItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted space-y-2">
                <p>Chưa có câu hỏi nào.</p>
                <p>Bấm &ldquo;Thêm câu&rdquo; hoặc &ldquo;Nhập CSV&rdquo; để bắt đầu.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1" role="list">
                {questionItems.map((item, idx) => {
                  const q = item.data;
                  const isActive = idx === activeQuestionIdx;
                  const isComplete =
                    q.prompt.trim() &&
                    q.a.trim() &&
                    q.b.trim() &&
                    q.c.trim() &&
                    (part === 2 || Boolean(q.d?.trim())) &&
                    Boolean(q.answer) &&
                    Boolean(q.explanation.trim()) &&
                    (part >= 1 && part <= 4 ? Boolean(q.audioUrl?.trim()) : true) &&
                    (part === 1 ? Boolean(q.imageUrl?.trim()) : true);

                  return (
                    <button
                      key={item.clientId}
                      type="button"
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={cn(
                        'w-full flex items-center justify-between p-2.5 rounded-md border text-xs text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'border-[1.5px] border-border bg-secondary/45 font-bold text-foreground shadow-subtle'
                          : 'border-border/40 bg-background hover:bg-muted text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
                        <span
                          className={cn(
                            'h-6 w-6 rounded-sm font-mono font-bold flex items-center justify-center text-[11px] shrink-0 border border-border',
                            isActive ? 'bg-primary text-foreground' : 'bg-surface text-ink-muted'
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate">
                          {q.prompt.trim() ? q.prompt : '(Câu hỏi chưa có nội dung)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-foreground" aria-label="Câu hỏi đã hoàn chỉnh" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-ink-muted" aria-label="Câu hỏi còn thiếu thông tin" />
                        )}
                        <span className="text-[11px] font-mono font-bold bg-surface border border-border px-1.5 py-0.5 rounded-sm text-foreground">
                          {q.answer || '?'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (8 cols): Question Editor Canvas */}
        <div className="lg:col-span-8">
          {activeQuestion && activeItem ? (
            <Card variant="default" className="p-5 sm:p-6 space-y-6">
              {/* Question Editor Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-extrabold bg-secondary px-2.5 py-1 rounded-sm border border-border text-foreground">
                    Câu #{activeQuestionIdx + 1} / {questions.length}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Part {part}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeQuestionIdx === 0 || isMutating}
                    onClick={() => handleMoveQuestion(activeQuestionIdx, 'up')}
                    className="h-8 w-8 p-0"
                    title="Chuyển câu hỏi lên trên"
                    aria-label="Chuyển câu hỏi lên trên"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeQuestionIdx === questions.length - 1 || isMutating}
                    onClick={() => handleMoveQuestion(activeQuestionIdx, 'down')}
                    className="h-8 w-8 p-0"
                    title="Chuyển câu hỏi xuống dưới"
                    aria-label="Chuyển câu hỏi xuống dưới"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isMutating}
                    onClick={() => handleRemoveQuestion(activeQuestionIdx)}
                    title="Xóa câu hỏi này"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa câu
                  </Button>
                </div>
              </div>

              {/* TOEIC Media & Passage Fields */}
              <div className="space-y-4 p-4 rounded-md bg-background border-[1.5px] border-border">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Đa phương tiện & đoạn văn (Part {part})
                </h3>

                {/* Audio for Listening Parts (1-4) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="question-audio-url" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Headphones className="h-3.5 w-3.5" /> Đường dẫn Audio (Listening Parts 1–4)
                    </label>
                    <span className="text-[11px] text-ink-muted">MP3, WAV (tối đa 20MB) hoặc dán URL</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="question-audio-url"
                      value={activeQuestion.audioUrl || ''}
                      disabled={isMutating}
                      onChange={(e) => handleUpdateActiveQuestion('audioUrl', e.target.value)}
                      placeholder="/ms/v1/contents/media/... hoặc URL âm thanh"
                      className="font-mono text-xs"
                    />
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      aria-label="Chọn file âm thanh để tải lên"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file && activeItem) {
                          void handleMediaUpload('audioUrl', activeItem.clientId, file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="md"
                      type="button"
                      disabled={isMutating || isUploadingAudio}
                      isLoading={isUploadingAudio}
                      onClick={() => audioInputRef.current?.click()}
                      className="shrink-0 text-xs"
                    >
                      {isUploadingAudio ? 'Đang tải Audio...' : 'Tải file Audio'}
                    </Button>
                  </div>
                  {audioUploadError && (
                    <Alert type="error" title="Lỗi tải file Audio">
                      {audioUploadError}
                    </Alert>
                  )}
                  {audioUploadSuccess && !audioUploadError && (
                    <p className="text-xs font-semibold text-foreground bg-success/40 border border-border rounded-sm px-2.5 py-1 inline-block">
                      {audioUploadSuccess}
                    </p>
                  )}
                  {activeQuestion.audioUrl && (
                    <audio controls preload="none" src={activeQuestion.audioUrl} className="w-full h-9 mt-1" />
                  )}
                </div>

                {/* Image for Part 1 (Photographs) */}
                <div className="space-y-2 pt-2 border-t border-border/15">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="question-image-url" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" /> Hình ảnh minh họa (Part 1 Photographs)
                    </label>
                    <span className="text-[11px] text-ink-muted">PNG, JPEG, WebP (tối đa 20MB)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="question-image-url"
                      value={activeQuestion.imageUrl || ''}
                      disabled={isMutating}
                      onChange={(e) => handleUpdateActiveQuestion('imageUrl', e.target.value)}
                      placeholder="/ms/v1/contents/media/... hoặc URL hình ảnh"
                      className="font-mono text-xs"
                    />
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-label="Chọn file hình ảnh để tải lên"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file && activeItem) {
                          void handleMediaUpload('imageUrl', activeItem.clientId, file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="md"
                      type="button"
                      disabled={isMutating || isUploadingImage}
                      isLoading={isUploadingImage}
                      onClick={() => imageInputRef.current?.click()}
                      className="shrink-0 text-xs"
                    >
                      {isUploadingImage ? 'Đang tải ảnh...' : 'Tải ảnh'}
                    </Button>
                  </div>
                  {imageUploadError && (
                    <Alert type="error" title="Lỗi tải hình ảnh">
                      {imageUploadError}
                    </Alert>
                  )}
                  {imageUploadSuccess && !imageUploadError && (
                    <p className="text-xs font-semibold text-foreground bg-success/40 border border-border rounded-sm px-2.5 py-1 inline-block">
                      {imageUploadSuccess}
                    </p>
                  )}
                  {activeQuestion.imageUrl && (
                    <div className="mt-2 max-h-48 rounded-md overflow-hidden border-[1.5px] border-border p-1.5 flex justify-center bg-surface">
                      <img
                        src={activeQuestion.imageUrl}
                        alt={`Xem trước hình ảnh câu ${activeQuestionIdx + 1}`}
                        className="max-h-44 object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Passage Text for Part 6 & 7 */}
                <div className="space-y-1.5 pt-2 border-t border-border/15">
                  <div className="flex items-center justify-between">
                    <label htmlFor="question-passage-text" className="text-xs font-bold text-foreground">
                      Đoạn văn đọc hiểu (Part 6 &amp; 7)
                    </label>
                    <span className="text-[11px] text-ink-muted">Tùy chọn</span>
                  </div>
                  <textarea
                    id="question-passage-text"
                    rows={3}
                    disabled={isMutating}
                    value={activeQuestion.passageText || ''}
                    onChange={(e) => handleUpdateActiveQuestion('passageText', e.target.value)}
                    placeholder="Dán nội dung đoạn văn, email, bài báo đọc hiểu vào đây..."
                    className="w-full rounded-md border-[1.5px] border-border bg-surface p-2.5 text-xs text-foreground font-serif placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <label htmlFor="question-prompt-text" className="text-sm font-bold text-foreground block">
                  Nội dung câu hỏi (Prompt) *
                </label>
                <textarea
                  id="question-prompt-text"
                  rows={4}
                  disabled={isMutating}
                  value={activeQuestion.prompt}
                  onChange={(e) => handleUpdateActiveQuestion('prompt', e.target.value)}
                  placeholder="Nhập nội dung câu hỏi hoặc câu điền khuyết..."
                  className="w-full rounded-md border-[1.5px] border-border bg-surface p-3 text-sm text-foreground placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>

              {/* Choices (3 for Part 2, 4 for other parts) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {part === 2 ? '3 phương án lựa chọn (Part 2: A–C)' : '4 phương án lựa chọn (A–D)'} &amp; chọn đáp án đúng *
                  </span>
                  <span className="text-xs text-ink-muted">Nhấn nút chữ cái để chọn đáp án đúng</span>
                </div>
                {(part === 2 ? (['a', 'b', 'c'] as const) : (['a', 'b', 'c', 'd'] as const)).map((optKey) => {
                  const letter = optKey.toUpperCase() as 'A' | 'B' | 'C' | 'D';
                  const isCorrect = activeQuestion.answer === letter;

                  return (
                    <div key={optKey} className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => handleUpdateActiveQuestion('answer', letter)}
                        aria-pressed={isCorrect}
                        aria-label={`Đặt ${letter} làm đáp án đúng`}
                        className={cn(
                          'h-10 w-10 rounded-md font-mono font-extrabold text-sm shrink-0 border-[1.5px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                          isCorrect
                            ? 'bg-success text-foreground border-border shadow-brutal-sm'
                            : 'bg-background text-ink-muted border-border hover:bg-muted hover:text-foreground'
                        )}
                        title="Bấm để đánh dấu đây là đáp án đúng"
                      >
                        {letter}
                      </button>
                      <Input
                        aria-label={`Nội dung lựa chọn ${letter}`}
                        value={activeQuestion[optKey] || ''}
                        disabled={isMutating}
                        onChange={(e) => handleUpdateActiveQuestion(optKey, e.target.value)}
                        placeholder={`Lựa chọn ${letter}...`}
                        className={cn(isCorrect && 'bg-success/20')}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Explanation Input */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="question-explanation-text" className="text-sm font-bold text-foreground">
                    Lời giải thích chi tiết (Explanation) *
                  </label>
                  <span className="text-[11px] text-ink-muted">Hiển thị cho học viên sau khi chấm điểm</span>
                </div>
                <textarea
                  id="question-explanation-text"
                  rows={3}
                  disabled={isMutating}
                  value={activeQuestion.explanation}
                  onChange={(e) => handleUpdateActiveQuestion('explanation', e.target.value)}
                  placeholder="Giải thích ngữ pháp, từ vựng hoặc lý do chọn đáp án này..."
                  className="w-full rounded-md border-[1.5px] border-border bg-surface p-3 text-sm text-foreground placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={Plus}
              title="Chưa có câu hỏi nào trong bản nháp"
              description="Thêm câu hỏi đầu tiên hoặc nhập hàng loạt từ tệp CSV để bắt đầu biên soạn nội dung."
              actionText="Thêm câu hỏi đầu tiên"
              onAction={isMutating ? undefined : handleAddQuestion}
            />
          )}
        </div>
      </div>

      {/* Reload from Server Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReloadConfirmOpen}
        onClose={() => setIsReloadConfirmOpen(false)}
        onConfirm={() => {
          void executeReloadFromServer();
        }}
        isLoading={isReloadingFromServer}
        title="Tải lại bản nháp từ máy chủ?"
        description="Thao tác này sẽ ghi đè toàn bộ nội dung chưa lưu hiện tại bằng phiên bản mới nhất trên máy chủ."
        confirmText="Xác nhận tải lại"
        cancelText="Giữ bản đang soạn"
        variant="destructive"
      />

      {/* Learner Preview Modal (Zero Quota) */}
      <LearnerPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={title}
        part={part}
        premium={premium}
        questions={questions}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={handleImportCsvQuestions}
      />
    </div>
  );
}
