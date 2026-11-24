import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { DraftDetail, QuestionInput, OwnedQuiz } from '@/types/quiz';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/feedback/Alert';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { CsvImportModal } from '@/features/teacher/CsvImportModal';
import { LearnerPreviewModal } from '@/features/teacher/LearnerPreviewModal';
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
  Eye
} from 'lucide-react';

export function QuizEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local draft form state
  const [title, setTitle] = useState('');
  const [part, setPart] = useState(5);
  const [premium, setPremium] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [currentVersion, setCurrentVersion] = useState<number>(0);

  // Status & Feedback state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // 1. Fetch Draft Details from Content Service
  const {
    data: draftData,
    isLoading,
    isError,
    refetch,
  } = useQuery<DraftDetail>({
    queryKey: ['teacher-draft', id],
    queryFn: () => apiRequest<DraftDetail>(`/ms/v1/contents/quizzes/${id}/draft`),
    enabled: Boolean(id),
    staleTime: 0,
  });

  // Initialize draft data
  useEffect(() => {
    if (draftData) {
      setTitle(draftData.quiz.title);
      setPart(draftData.quiz.part);
      setPremium(draftData.quiz.premium);
      setQuestions(draftData.questions || []);
      setCurrentVersion(draftData.quiz.version);
      setHasUnsavedChanges(false);
      setConflictError(null);
    }
  }, [draftData]);

  // Window unload protection for unsaved work
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeUnload', handleBeforeUnload);
    return () => window.removeEventListener('beforeUnload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 2. Save Draft Mutation (PUT /ms/v1/contents/quizzes/{id}/draft)
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<DraftDetail>(`/ms/v1/contents/quizzes/${id}/draft`, {
        method: 'PUT',
        body: JSON.stringify({
          version: currentVersion,
          quiz: {
            title: title.trim(),
            part,
            premium,
            questions,
          },
        }),
      });
    },
    onSuccess: (updated) => {
      setCurrentVersion(updated.quiz.version);
      setHasUnsavedChanges(false);
      setConflictError(null);
      setErrorMessage(null);
      setSaveSuccess(`Đã lưu bản nháp thành công! (Phiên bản v${updated.quiz.version})`);
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
    },
    onError: (err: unknown) => {
      setSaveSuccess(null);
      // Check 409 conflict
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu bản nháp';
      if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
        setConflictError(
          'Đã xảy ra xung đột phiên bản (HTTP 409). Một thay đổi khác đã được lưu từ phiên làm việc khác. Dữ liệu hiện tại của bạn vẫn được giữ trên màn hình, vui lòng kiểm tra hoặc tải lại để đồng bộ.'
        );
      } else {
        setErrorMessage(msg);
      }
    },
  });

  // 3. Publish Mutation (POST /ms/v1/contents/quizzes/{id}/publish)
  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<OwnedQuiz>(`/ms/v1/contents/quizzes/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ version: currentVersion }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['public-quizzes'] });
      navigate('/teacher/quizzes', { replace: true });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Xuất bản thất bại';
      if (msg.includes('409')) {
        setConflictError('Xung đột phiên bản khi xuất bản (409). Bản nháp cần được lưu phiên bản mới nhất trước khi xuất bản.');
      } else {
        setErrorMessage(msg);
      }
    },
  });

  // Question editing helpers
  const handleUpdateActiveQuestion = useCallback(
    (field: keyof QuestionInput, val: string) => {
      setQuestions((prev) => {
        const next = [...prev];
        if (next[activeQuestionIdx]) {
          next[activeQuestionIdx] = {
            ...next[activeQuestionIdx],
            [field]: val,
          };
        }
        return next;
      });
      setHasUnsavedChanges(true);
    },
    [activeQuestionIdx]
  );

  const handleAddQuestion = () => {
    const newQ: QuestionInput = {
      prompt: '',
      a: '',
      b: '',
      c: '',
      d: '',
      answer: 'A',
      explanation: '',
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIdx(questions.length);
    setHasUnsavedChanges(true);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Đề thi cần có tối thiểu 1 câu hỏi.');
      return;
    }
    const next = questions.filter((_, i) => i !== idx);
    setQuestions(next);
    setActiveQuestionIdx(Math.max(0, idx - 1));
    setHasUnsavedChanges(true);
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const next = [...questions];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;

    setQuestions(next);
    setActiveQuestionIdx(targetIdx);
    setHasUnsavedChanges(true);
  };

  const handleImportCsvQuestions = (imported: QuestionInput[]) => {
    setQuestions((prev) => [...prev, ...imported]);
    setHasUnsavedChanges(true);
    setSaveSuccess(`Đã nhập thành công ${imported.length} câu hỏi từ tệp CSV vào bản nháp.`);
  };

  // Publish validation check
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-10 w-64 rounded-md" />
        <SkeletonLoader className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !draftData) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy bản nháp</h2>
        <p className="text-xs text-slate-500">
          Đề thi này có thể đã được xuất bản hoặc bạn không có quyền sở hữu.
        </p>
        <Link to="/teacher/quizzes">
          <Button variant="primary" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Về danh sách đề thi
          </Button>
        </Link>
      </div>
    );
  }

  const activeQuestion = questions[activeQuestionIdx];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/teacher/quizzes">
            <Button variant="ghost" size="sm" className="text-slate-600">
              <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 truncate max-w-sm">
                {title || 'Đề thi không có tiêu đề'}
              </h1>
              <Badge variant="secondary" className="text-[10px]">
                Bản nháp (v{currentVersion})
              </Badge>
              {hasUnsavedChanges && (
                <span className="text-[11px] font-semibold text-amber-600">
                  (Chưa lưu thay đổi)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Part {part} • {questions.length} câu hỏi</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Xem trước (Learner)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCsvModalOpen(true)}
            className="text-xs text-slate-700"
          >
            <UploadCloud className="h-3.5 w-3.5 mr-1.5" /> Nhập CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? 'Đang lưu...' : 'Lưu bản nháp'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || Boolean(publishValidation) || hasUnsavedChanges}
            title={
              hasUnsavedChanges
                ? 'Hãy lưu bản nháp trước khi xuất bản'
                : publishValidation || 'Xuất bản đề thi'
            }
            className="text-xs font-bold"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {publishMutation.isPending ? 'Đang xuất bản...' : 'Xuất bản đề thi'}
          </Button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {conflictError && (
        <Alert type="error" title="Xung đột phiên bản">
          {conflictError}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
              Tải lại từ máy chủ (Ghi đè màn hình)
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
        <Alert type="success" title="Thành công">
          {saveSuccess}
        </Alert>
      )}

      {/* Main Studio Workspace: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Metadata & Question List */}
        <div className="lg:col-span-4 space-y-4">
          {/* General Metadata Settings */}
          <Card className="p-4 border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cấu hình chung</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tiêu đề đề thi</label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="text-xs"
                placeholder="Nhập tiêu đề đề thi..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phần thi</label>
                <select
                  value={part}
                  onChange={(e) => {
                    setPart(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                    <option key={p} value={p}>Part {p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Gói quyền lợi</label>
                <select
                  value={premium ? 'PRO' : 'FREE'}
                  onChange={(e) => {
                    setPremium(e.target.value === 'PRO');
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
                >
                  <option value="FREE">FREE (Miễn phí)</option>
                  <option value="PRO">PRO (Chỉ VIP)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Question List Navigator */}
          <Card className="p-4 border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Danh sách câu hỏi ({questions.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="h-3 w-3 mr-1" /> Thêm câu
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có câu hỏi nào. Bấm "Thêm câu" hoặc "Nhập CSV".
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isActive = idx === activeQuestionIdx;
                  const isComplete =
                    q.prompt.trim() && q.a.trim() && q.b.trim() && q.c.trim() && (part === 2 || Boolean(q.d?.trim())) && q.answer;

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-900'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="truncate">
                          {q.prompt.trim() ? q.prompt : '(Câu hỏi chưa có nội dung)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                          {q.answer || '?'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (8 cols): Question Editor Canvas */}
        <div className="lg:col-span-8">
          {activeQuestion ? (
            <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-6">
              {/* Question Editor Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Chỉnh sửa Câu #{activeQuestionIdx + 1}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Part {part}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeQuestionIdx === 0}
                    onClick={() => handleMoveQuestion(activeQuestionIdx, 'up')}
                    className="h-7 w-7 p-0"
                    title="Đổi lên trên"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeQuestionIdx === questions.length - 1}
                    onClick={() => handleMoveQuestion(activeQuestionIdx, 'down')}
                    className="h-7 w-7 p-0"
                    title="Đổi xuống dưới"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveQuestion(activeQuestionIdx)}
                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    title="Xóa câu hỏi này"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
                  </Button>
                </div>
              </div>

              {/* TOEIC Media & Passage Fields */}
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Đa phương tiện & Đoạn văn (Part {part})
                </span>

                {/* Audio for Listening Parts (1-4) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Đường dẫn Audio (Listening Parts 1-4)</span>
                    <span className="text-[11px] text-slate-400 font-normal">Tự tải lên hoặc dán URL</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={activeQuestion.audioUrl || ''}
                      onChange={(e) => handleUpdateActiveQuestion('audioUrl', e.target.value)}
                      placeholder="/ms/v1/contents/media/... hoặc URL âm thanh"
                      className="text-xs font-mono"
                    />
                    <label className="shrink-0 cursor-pointer">
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch('/ms/v1/contents/media/upload', {
                              method: 'POST',
                              body: formData,
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem('toeic_auth_token') || ''}`,
                              },
                            });
                            if (!res.ok) throw new Error('Upload thất bại (' + res.status + ')');
                            const data = await res.json();
                            handleUpdateActiveQuestion('audioUrl', data.url);
                          } catch (err: unknown) {
                            alert('Lỗi upload audio: ' + (err instanceof Error ? err.message : String(err)));
                          }
                        }}
                      />
                      <Button variant="outline" size="sm" type="button" className="text-xs pointer-events-none">
                        Tải file Audio
                      </Button>
                    </label>
                  </div>
                  {activeQuestion.audioUrl && (
                    <audio controls src={activeQuestion.audioUrl} className="w-full h-8 mt-1" />
                  )}
                </div>

                {/* Image for Part 1 (Photographs) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Hình ảnh mô tả (Part 1 Photographs)</span>
                    <span className="text-[11px] text-slate-400 font-normal">PNG, JPEG, WebP</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={activeQuestion.imageUrl || ''}
                      onChange={(e) => handleUpdateActiveQuestion('imageUrl', e.target.value)}
                      placeholder="/ms/v1/contents/media/... hoặc URL hình ảnh"
                      className="text-xs font-mono"
                    />
                    <label className="shrink-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch('/ms/v1/contents/media/upload', {
                              method: 'POST',
                              body: formData,
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem('toeic_auth_token') || ''}`,
                              },
                            });
                            if (!res.ok) throw new Error('Upload thất bại (' + res.status + ')');
                            const data = await res.json();
                            handleUpdateActiveQuestion('imageUrl', data.url);
                          } catch (err: unknown) {
                            alert('Lỗi upload ảnh: ' + (err instanceof Error ? err.message : String(err)));
                          }
                        }}
                      />
                      <Button variant="outline" size="sm" type="button" className="text-xs pointer-events-none">
                        Tải ảnh
                      </Button>
                    </label>
                  </div>
                  {activeQuestion.imageUrl && (
                    <div className="mt-2 max-h-40 rounded-lg overflow-hidden border border-slate-200 p-1 flex justify-center bg-white">
                      <img src={activeQuestion.imageUrl} alt="Xem trước" className="max-h-36 object-contain" />
                    </div>
                  )}
                </div>

                {/* Passage Text for Part 6 & 7 (or conversation/talk text) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Đoạn văn đọc hiểu (Reading Passage - Part 6 & 7)</span>
                    <span className="text-[11px] text-slate-400 font-normal">Tùy chọn</span>
                  </label>
                  <textarea
                    rows={3}
                    value={activeQuestion.passageText || ''}
                    onChange={(e) => handleUpdateActiveQuestion('passageText', e.target.value)}
                    placeholder="Dán nội dung đoạn văn, email, bài báo đọc hiểu vào đây..."
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 font-serif"
                  />
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Nội dung câu hỏi (Prompt) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={activeQuestion.prompt}
                  onChange={(e) => handleUpdateActiveQuestion('prompt', e.target.value)}
                  placeholder="Nhập nội dung câu hỏi hoặc đoạn văn bản..."
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Choices (3 for Part 2, 4 for other parts) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800">
                  {part === 2 ? '3 Phương án lựa chọn (Part 2: A - C)' : '4 Phương án lựa chọn (A - D)'} & Chọn đáp án đúng <span className="text-rose-500">*</span>
                </label>
                {(part === 2 ? (['a', 'b', 'c'] as const) : (['a', 'b', 'c', 'd'] as const)).map((optKey) => {
                  const letter = optKey.toUpperCase() as 'A' | 'B' | 'C' | 'D';
                  const isCorrect = activeQuestion.answer === letter;

                  return (
                    <div key={optKey} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateActiveQuestion('answer', letter)}
                        className={`h-9 w-9 rounded-lg font-bold text-xs shrink-0 border transition-all ${
                          isCorrect
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Bấm để đánh dấu đây là đáp án đúng"
                      >
                        {letter}
                      </button>
                      <Input
                        value={activeQuestion[optKey] || ''}
                        onChange={(e) => handleUpdateActiveQuestion(optKey, e.target.value)}
                        placeholder={`Lựa chọn ${letter}...`}
                        className={`text-sm ${isCorrect ? 'border-blue-300 bg-blue-50/20' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Explanation Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Lời giải thích chi tiết (Explanation) <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-slate-400 font-normal">Hiển thị cho học viên sau khi chấm</span>
                </label>
                <textarea
                  rows={3}
                  value={activeQuestion.explanation}
                  onChange={(e) => handleUpdateActiveQuestion('explanation', e.target.value)}
                  placeholder="Giải thích ngữ pháp, từ vựng hoặc lý do chọn đáp án này..."
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-500 space-y-3">
              <p>Chưa chọn câu hỏi nào để chỉnh sửa.</p>
              <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-1.5" /> Thêm câu hỏi đầu tiên
              </Button>
            </Card>
          )}
        </div>
      </div>

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
