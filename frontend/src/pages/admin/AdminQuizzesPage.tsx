import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AdminQuizzes, AdminQuiz, AdminQuizDetail } from '@/types/admin';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
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
  Filter
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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
  const { data: detailData, isLoading: isDetailLoading } = useQuery<AdminQuizDetail>({
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
      queryClient.invalidateQueries({ queryKey: ['admin-quiz-detail', previewQuizId] });
      queryClient.invalidateQueries({ queryKey: ['public-quizzes'] });
      setActionError(null);
      setActionSuccess(
        `Đã cập nhật trạng thái đề thi "${updated.title}" thành ${updated.status === 'PUBLISHED' ? 'CÔNG KHAI' : 'ẨN/BẢN NHÁP'} (v${updated.version})`
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái';
      if (msg.includes('409')) {
        setActionError('Xung đột phiên bản (409): Đề thi đã bị thay đổi bởi người khác. Vui lòng thử lại.');
      } else {
        setActionError(msg);
      }
    },
  });

  const totalPages = useMemo(() => {
    if (!quizzesPage) return 0;
    return Math.ceil(quizzesPage.total / quizzesPage.size);
  }, [quizzesPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchTerm.trim());
    setPage(0);
  };

  // Columns for DataTable
  const columns: Column<AdminQuiz>[] = [
    {
      key: 'title',
      header: 'Tiêu đề đề thi',
      render: (quiz) => (
        <span className="font-bold text-slate-900 block max-w-xs truncate" title={quiz.title}>
          {quiz.title}
        </span>
      ),
    },
    {
      key: 'part',
      header: 'Phần thi',
      render: (quiz) => <span className="font-medium">Part {quiz.part}</span>,
    },
    {
      key: 'premium',
      header: 'Gói cước',
      render: (quiz) =>
        quiz.premium ? (
          <Badge variant="pro" className="text-[10px]">PRO</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">FREE</Badge>
        ),
    },
    {
      key: 'count',
      header: 'Số câu',
      render: (quiz) => <span className="font-semibold text-slate-900">{quiz.count} câu</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (quiz) => {
        const isPublished = quiz.status === 'PUBLISHED';
        return (
          <Badge variant={isPublished ? 'default' : 'secondary'} className="text-[10px]">
            {isPublished ? 'Đã xuất bản (Hiện)' : 'Bản nháp / Ẩn'}
          </Badge>
        );
      },
    },
    {
      key: 'version',
      header: 'Phiên bản',
      render: (quiz) => <span className="font-mono text-[11px] text-slate-500">v{quiz.version}</span>,
    },
    {
      key: 'actions',
      header: <span className="block text-right">Kiểm duyệt</span>,
      className: 'text-right',
      render: (quiz) => {
        const isPublished = quiz.status === 'PUBLISHED';
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewQuizId(quiz.id)}
              className="h-7 text-xs text-slate-700"
            >
              <BookOpen className="h-3 w-3 mr-1" /> Xem trước
            </Button>

            {isPublished ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate({ quiz, targetPublished: false })}
                className="h-7 text-xs"
              >
                Gỡ xuống (Ẩn)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={visibilityMutation.isPending || quiz.count === 0}
                onClick={() => visibilityMutation.mutate({ quiz, targetPublished: true })}
                className="h-7 text-xs"
                title={quiz.count === 0 ? 'Không thể xuất bản đề thi 0 câu hỏi' : ''}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-rose-600" /> Kiểm Duyệt & Quản Trị Kho Đề Thi
          </h1>
          <p className="text-xs text-slate-500">
            Theo dõi toàn bộ đề thi của các giảng viên, kiểm duyệt câu hỏi và kích hoạt/hạ trạng thái xuất bản công khai.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" title="Thành công">
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" title="Lỗi thao tác">
          {actionError}
        </Alert>
      )}

      {/* Filter and Search Bar using Atoms/Molecules */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <SearchInput
              placeholder="Nhập tiêu đề đề thi cần tìm kiếm..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="h-9 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'PUBLISHED' | 'DRAFT');
                setPage(0);
              }}
              className="h-9 text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'PUBLISHED', label: 'Đã xuất bản (PUBLISHED)' },
                { value: 'DRAFT', label: 'Bản nháp/Ẩn (DRAFT)' },
              ]}
            />
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <Select
              value={partFilter}
              onChange={(e) => {
                setPartFilter(Number(e.target.value));
                setPage(0);
              }}
              className="h-9 text-xs"
              options={[
                { value: 0, label: 'Tất cả các Part (1-7)' },
                ...[1, 2, 3, 4, 5, 6, 7].map((p) => ({ value: p, label: `Part ${p}` })),
              ]}
            />

            <Button type="submit" variant="primary" size="sm" className="h-9 px-4 text-xs font-semibold shrink-0">
              Lọc
            </Button>
          </div>
        </form>
      </Card>

      {/* Quizzes Table (Organism) */}
      {isError ? (
        <div className="p-8 text-center space-y-2 bg-white rounded-xl border border-slate-200">
          <p className="text-sm font-semibold text-rose-600">
            {error instanceof Error ? error.message : 'Lỗi tải danh sách đề thi.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={quizzesPage?.quizzes || []}
          keyExtractor={(quiz) => quiz.id}
          isLoading={isLoading}
          emptyIcon={Filter}
          emptyTitle="Không tìm thấy đề thi"
          emptyDescription="Không có đề thi nào khớp với từ khóa hoặc bộ lọc kiểm duyệt hiện tại."
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: setPage,
            baseIndex: 0,
            totalItems: quizzesPage?.total,
            pageSize: quizzesPage?.size,
          }}
        />
      )}

      {/* Quiz Detail Preview Dialog using Atom Dialog */}
      <Dialog open={Boolean(previewQuizId)} onOpenChange={(open) => !open && setPreviewQuizId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <DialogTitle>Xem Trước Chi Tiết Đề Thi</DialogTitle>
            </div>
            <DialogDescription>
              Xem chi tiết nội dung các câu hỏi trước khi quyết định kiểm duyệt xuất bản.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {isDetailLoading ? (
              <div className="space-y-3 py-6">
                <p className="text-xs text-slate-500 text-center">Đang tải dữ liệu câu hỏi chi tiết...</p>
              </div>
            ) : detailData ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{detailData.quiz.title}</p>
                  <div className="flex gap-4 text-slate-500">
                    <span>Part: <strong>{detailData.quiz.part}</strong></span>
                    <span>Số câu: <strong>{detailData.questions.length}</strong></span>
                    <span>Gói: <strong>{detailData.quiz.premium ? 'PRO' : 'FREE'}</strong></span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Danh Sách Câu Hỏi ({detailData.questions.length}):
                  </h4>

                  {detailData.questions.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                      Đề thi này hiện chưa có câu hỏi nào.
                    </p>
                  ) : (
                    detailData.questions.map((q, idx) => (
                      <div key={q.id || idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                        <div className="font-semibold text-slate-900">
                          Câu {idx + 1}: {q.prompt}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600 pl-2">
                          <div>A: {q.choices?.A || '—'}</div>
                          <div>B: {q.choices?.B || '—'}</div>
                          <div>C: {q.choices?.C || '—'}</div>
                          {q.choices?.D && <div>D: {q.choices.D}</div>}
                        </div>
                      </div>
                    ))
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
