import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { AdminQuizzes, AdminQuiz, AdminQuizDetail } from '@/types/admin';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/Dialog';
import { SearchInput } from '@/components/molecules/SearchInput';
import { Alert } from '@/components/molecules/Alert';
import { DataTable, Column } from '@/components/organisms/DataTable';
import {
  ShieldCheck,
  Eye,
  BookOpen,
  Filter,
  RefreshCw,
  Headphones,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';

export function AdminQuizzesPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [partFilter, setPartFilter] = useState<number>(0);
  const [page, setPage] = useState(0);

  // Detail preview modal state
  const [previewQuizId, setPreviewQuizId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setFailedImages({});
  }, [previewQuizId]);

  // 1. Fetch Global Quizzes for Admin
  const { data: quizzesPage, isLoading, isError, error, refetch } = useQuery<AdminQuizzes>({
    queryKey: ['admin-quizzes', debouncedQuery, statusFilter, partFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        status: statusFilter,
        part: partFilter.toString(),
        page: page.toString(),
      });
      return apiRequest<AdminQuizzes>(`/ms/v1/contents/quizzes/admin?${params.toString()}`);
    },
    staleTime: 1000 * 20,
  });

  // 2. Fetch Single Quiz Detail for Preview Modal
  const {
    data: detailData,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery<AdminQuizDetail>({
    queryKey: ['admin-quiz-detail', previewQuizId],
    queryFn: () => apiRequest<AdminQuizDetail>(`/ms/v1/contents/quizzes/admin/${previewQuizId}`),
    enabled: Boolean(previewQuizId),
  });

  // 3. Visibility Change Mutation
  const visibilityMutation = useMutation({
    mutationFn: async ({ quiz, targetPublished }: { quiz: AdminQuiz; targetPublished: boolean }) => {
      return apiRequest<AdminQuiz>(`/ms/v1/contents/quizzes/admin/${quiz.id}/visibility`, {
        method: 'POST',
        body: JSON.stringify({
          version: quiz.version,
          published: targetPublished,
        }),
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quiz-detail', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['public-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
      // Refresh draft cache only when not currently edited cleanly; QuizEditPage guards unsaved edits against background refetch
      queryClient.invalidateQueries({ queryKey: ['teacher-draft', updated.id] });
      setActionError(null);
      setActionSuccess(
        `Đã cập nhật trạng thái đề thi "${updated.title}" thành ${updated.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp / Ẩn'} (v${updated.version}).`
      );
    },
    onError: (err: unknown) => {
      setActionSuccess(null);
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái';
      if (err instanceof ApiError) {
        if (err.isConflict()) {
          setActionError('Xung đột phiên bản (HTTP 409): Đề thi đã bị thay đổi bởi phiên khác. Vui lòng tải lại danh sách và thử lại.');
          return;
        }
        if (err.isForbidden()) {
          setActionError('Không đủ quyền thực hiện (HTTP 403): Tài khoản không có quyền kiểm duyệt kho đề thi.');
          return;
        }
        if (err.isNotFound()) {
          setActionError('Không tìm thấy đề thi (HTTP 404): Đề thi không tồn tại trên hệ thống.');
          return;
        }
      }
      if (msg.includes('409')) {
        setActionError('Xung đột phiên bản (HTTP 409): Đề thi đã bị thay đổi bởi người khác. Vui lòng thử lại.');
      } else {
        setActionError(msg);
      }
    },
  });

  const totalPages = useMemo(() => {
    if (!quizzesPage || quizzesPage.size <= 0) return 0;
    return Math.ceil(quizzesPage.total / quizzesPage.size);
  }, [quizzesPage]);

  // Adjust out-of-range page based only on matching settled server response
  useEffect(() => {
    if (isLoading || isError || !quizzesPage || quizzesPage.page !== page) return;
    if (quizzesPage.total === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isLoading, isError, quizzesPage, page, totalPages]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchTerm.trim());
    setPage(0);
  };

  // Columns for DataTable
  const columns: Column<AdminQuiz>[] = [
    {
      key: 'title',
      header: 'Đề thi & chủ sở hữu',
      render: (quiz) => (
        <div className="max-w-xs space-y-0.5">
          <span className="font-extrabold text-foreground block break-words" tabIndex={0} title={quiz.title}>
            {quiz.title}
          </span>
          <span className="font-mono text-[11px] text-ink-muted block break-all select-all" tabIndex={0} title={`Owner UUID: ${quiz.ownerUserId}`}>
            Tác giả: {quiz.ownerUserId.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: 'part',
      header: 'Phần thi',
      render: (quiz) => (
        <Badge variant="outline" className="text-xs">
          Part {quiz.part}
        </Badge>
      ),
    },
    {
      key: 'premium',
      header: 'Gói áp dụng',
      render: (quiz) =>
        quiz.premium ? (
          <Badge variant="pro" className="text-[11px]">PRO</Badge>
        ) : (
          <Badge variant="outline" className="text-[11px]">FREE</Badge>
        ),
    },
    {
      key: 'count',
      header: 'Số câu',
      render: (quiz) => <span className="font-mono font-bold text-foreground">{quiz.count} câu</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (quiz) => <StatusBadge status={quiz.status} />,
    },
    {
      key: 'version',
      header: 'Phiên bản',
      render: (quiz) => <span className="font-mono text-xs text-ink-muted">v{quiz.version}</span>,
    },
    {
      key: 'actions',
      header: <span className="block text-right">Kiểm duyệt</span>,
      className: 'text-right',
      render: (quiz) => {
        const isPublished = quiz.status === 'PUBLISHED';
        return (
          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewQuizId(quiz.id)}
            >
              <BookOpen className="h-3.5 w-3.5" /> Xem trước
            </Button>

            {isPublished ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate({ quiz, targetPublished: false })}
              >
                Gỡ xuống (Ẩn)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={visibilityMutation.isPending || quiz.count === 0}
                onClick={() => visibilityMutation.mutate({ quiz, targetPublished: true })}
                title={quiz.count === 0 ? 'Không thể xuất bản đề thi 0 câu hỏi' : 'Xuất bản công khai đề thi'}
              >
                Xuất bản ngay
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[1.5px] border-border pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-foreground" /> Kiểm duyệt &amp; quản trị kho đề thi
          </h1>
          <p className="text-sm text-ink-muted">
            Xem chi tiết đề thi của giảng viên, rà soát nội dung và bật/tắt trạng thái công khai
          </p>
        </div>
        {quizzesPage && (
          <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
            {quizzesPage.total} đề thi
          </Badge>
        )}
      </div>

      {actionSuccess && (
        <Alert type="success" title="Cập nhật hiển thị thành công">
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" title="Lỗi thao tác kiểm duyệt">
          {actionError}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card variant="default" className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5">
            <SearchInput
              placeholder="Nhập tiêu đề đề thi cần tìm kiếm..."
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                if (val === '' && debouncedQuery !== '') {
                  setDebouncedQuery('');
                  setPage(0);
                }
              }}
              aria-label="Tìm kiếm đề thi theo tiêu đề"
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              aria-label="Lọc theo trạng thái hiển thị"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'PUBLISHED' | 'DRAFT');
                setPage(0);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'PUBLISHED', label: 'Đã xuất bản (Công khai)' },
                { value: 'DRAFT', label: 'Bản nháp / Đang ẩn' },
              ]}
            />
          </div>

          <div className="sm:col-span-2">
            <Select
              aria-label="Lọc theo phần thi TOEIC"
              value={String(partFilter)}
              onChange={(e) => {
                setPartFilter(Number(e.target.value));
                setPage(0);
              }}
              options={[
                { value: '0', label: 'Tất cả Part (1–7)' },
                ...[1, 2, 3, 4, 5, 6, 7].map((p) => ({ value: String(p), label: `Part ${p}` })),
              ]}
            />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="md" className="w-full">
              Lọc dữ liệu
            </Button>
          </div>
        </form>
      </Card>

      {/* Quizzes Table (Organism) */}
      {isError ? (
        <Alert type="error" title="Lỗi tải danh sách đề thi">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{error instanceof Error ? error.message : 'Không thể tải danh sách đề thi quản trị.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={quizzesPage?.quizzes || []}
          keyExtractor={(quiz) => quiz.id}
          isLoading={isLoading}
          emptyIcon={Filter}
          emptyTitle="Không tìm thấy đề thi"
          emptyDescription="Không có đề thi nào khớp với từ khóa hoặc bộ lọc kiểm duyệt hiện tại."
          pagination={
            quizzesPage && quizzesPage.total > quizzesPage.size
              ? {
                  currentPage: page,
                  totalPages,
                  onPageChange: setPage,
                  baseIndex: 0,
                  totalItems: quizzesPage.total,
                  pageSize: quizzesPage.size,
                }
              : undefined
          }
        />
      )}

      {/* Quiz Detail Preview Dialog using Atom Dialog */}
      <Dialog open={Boolean(previewQuizId)} onOpenChange={(open) => !open && setPreviewQuizId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-warning/50 border border-border text-foreground shrink-0">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Xem trước chi tiết đề thi</DialogTitle>
                <DialogDescription>
                  Rà soát nội dung câu hỏi và tệp phương tiện trước khi quyết định xuất bản hoặc ẩn đề thi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {isDetailLoading ? (
              <div className="space-y-3 py-4">
                <SkeletonLoader className="h-20 w-full rounded-md" />
                <SkeletonLoader className="h-28 w-full rounded-md" />
              </div>
            ) : isDetailError ? (
              <Alert type="error" title="Không thể tải chi tiết đề thi">
                {detailError instanceof Error ? detailError.message : 'Lỗi tải nội dung câu hỏi.'}
              </Alert>
            ) : detailData ? (
              <div className="space-y-4">
                <div className="bg-background p-4 rounded-md border-[1.5px] border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-extrabold text-foreground text-sm">{detailData.quiz.title}</p>
                    <StatusBadge status={detailData.quiz.status} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-ink-muted font-mono">
                    <span>Part {detailData.quiz.part}</span>
                    <span>•</span>
                    <span>{detailData.questions.length} câu hỏi</span>
                    <span>•</span>
                    <span>{detailData.quiz.premium ? 'PRO' : 'FREE'}</span>
                    <span>•</span>
                    <span>v{detailData.quiz.version}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Danh sách câu hỏi ({detailData.questions.length}):
                  </h3>

                  {detailData.questions.length === 0 ? (
                    <Alert type="warning" title="Đề thi trống">
                      Đề thi này hiện chưa có câu hỏi nào và chưa thể xuất bản công khai.
                    </Alert>
                  ) : (
                    detailData.questions.map((q, idx) => {
                      const imgKey = `${detailData.quiz.id}:${q.id || idx}:${q.imageUrl || ''}`;
                      const imgFailed = Boolean(failedImages[imgKey]);
                      const choiceKeys = Object.keys(q.choices || {});

                      return (
                        <div key={q.id || idx} className="p-3.5 bg-surface rounded-md border-[1.5px] border-border space-y-3 text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono font-extrabold bg-muted px-2 py-0.5 rounded-sm border border-border text-foreground">
                              Câu #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {q.audioUrl && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Headphones className="h-3 w-3" /> Audio
                                </Badge>
                              )}
                              {q.imageUrl && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <ImageIcon className="h-3 w-3" /> Hình ảnh
                                </Badge>
                              )}
                              {q.passageText && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <FileText className="h-3 w-3" /> Đoạn văn
                                </Badge>
                              )}
                            </div>
                          </div>

                          {q.audioUrl && (
                            <div className="p-2.5 rounded-sm bg-background border border-border/50 space-y-1.5">
                              <span className="text-[11px] font-bold text-foreground block">
                                Tệp âm thanh đính kèm:
                              </span>
                              <audio controls preload="none" src={q.audioUrl} className="w-full h-9">
                                Trình duyệt không hỗ trợ phát audio trực tiếp.
                              </audio>
                            </div>
                          )}

                          {q.imageUrl && (
                            <div className="rounded-sm border border-border/50 bg-background p-2 flex flex-col items-center justify-center max-h-56 overflow-hidden">
                              {imgFailed ? (
                                <p className="text-xs text-ink-muted py-4">
                                  Không thể tải hình ảnh xem trước ({q.imageUrl}).
                                </p>
                              ) : (
                                <img
                                  src={q.imageUrl}
                                  alt={`Hình minh họa câu ${idx + 1}`}
                                  className="max-h-48 w-auto object-contain"
                                  onError={() => setFailedImages((prev) => ({ ...prev, [imgKey]: true }))}
                                />
                              )}
                            </div>
                          )}

                          {q.passageText && (
                            <div className="p-2.5 rounded-sm bg-background border border-border/50 font-serif text-xs text-ink-muted whitespace-pre-wrap">
                              {q.passageText}
                            </div>
                          )}

                          <p className="font-bold text-foreground text-sm leading-relaxed">{q.prompt}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink-muted">
                            {choiceKeys.map((choiceKey) => (
                              <div key={choiceKey} className="p-2 rounded-sm bg-background border border-border/40">
                                <strong className="font-mono text-foreground">{choiceKey}:</strong>{' '}
                                {q.choices[choiceKey] || '—'}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreviewQuizId(null)}>
              Đóng xem trước
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
