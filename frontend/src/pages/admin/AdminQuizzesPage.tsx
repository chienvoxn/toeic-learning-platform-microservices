import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AdminQuizzes, AdminQuiz, AdminQuizDetail } from '@/types/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { Alert } from '@/components/feedback/Alert';
import {
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X
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

  // 3. Visibility Change Mutation (POST /ms/v1/contents/quizzes/admin/{id}/visibility)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kiểm Duyệt & Quản Lý Đề Thi Toàn Hệ Thống</h1>
          <p className="text-xs text-slate-500">
            Xem toàn bộ đề thi do các giảng viên biên soạn, kiểm tra nội dung và điều chỉnh trạng thái hiển thị (Xuất bản / Ẩn).
          </p>
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" title="Thành công">
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" title="Lỗi thực hiện">
          {actionError}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nhập tiêu đề đề thi cần tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'PUBLISHED' | 'DRAFT');
                setPage(0);
              }}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
              <option value="DRAFT">Bản nháp/Ẩn (DRAFT)</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <select
              value={partFilter}
              onChange={(e) => {
                setPartFilter(Number(e.target.value));
                setPage(0);
              }}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value={0}>Tất cả các Part (1-7)</option>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <option key={p} value={p}>Part {p}</option>
              ))}
            </select>

            <Button type="submit" variant="primary" size="sm" className="h-9 px-4 text-xs font-semibold shrink-0">
              Lọc
            </Button>
          </div>
        </form>
      </Card>

      {/* Quizzes Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <SkeletonLoader className="h-12 w-full rounded-md" />
            <SkeletonLoader className="h-12 w-full rounded-md" />
            <SkeletonLoader className="h-12 w-full rounded-md" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-rose-600">
              {error instanceof Error ? error.message : 'Lỗi tải danh sách đề thi.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
              Thử lại
            </Button>
          </div>
        ) : !quizzesPage || quizzesPage.quizzes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy đề thi</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có đề thi nào khớp với từ khóa hoặc bộ lọc kiểm duyệt hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tiêu đề đề thi</th>
                  <th className="py-3 px-4">Phần thi</th>
                  <th className="py-3 px-4">Gói cước</th>
                  <th className="py-3 px-4">Số câu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Phiên bản</th>
                  <th className="py-3 px-4 text-right">Kiểm duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quizzesPage.quizzes.map((quiz) => {
                  const isPublished = quiz.status === 'PUBLISHED';
                  return (
                    <tr key={quiz.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {quiz.title}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        Part {quiz.part}
                      </td>
                      <td className="py-3 px-4">
                        {quiz.premium ? (
                          <Badge variant="pro" className="text-[10px]">PRO</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">FREE</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {quiz.count} câu
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isPublished ? 'default' : 'secondary'} className="text-[10px]">
                          {isPublished ? 'Đã xuất bản (Hiện)' : 'Bản nháp / Ẩn'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        v{quiz.version}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
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
                            title="Chuyển về trạng thái ẩn/nháp"
                          >
                            <EyeOff className="h-3 w-3 mr-1" /> Ẩn đề
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={visibilityMutation.isPending || quiz.count === 0}
                            onClick={() => visibilityMutation.mutate({ quiz, targetPublished: true })}
                            className="h-7 text-xs"
                            title={quiz.count === 0 ? 'Đề thi trống không thể duyệt' : 'Duyệt xuất bản'}
                          >
                            <Eye className="h-3 w-3 mr-1" /> Duyệt công khai
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination */}
        {quizzesPage && quizzesPage.total > quizzesPage.size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({quizzesPage.total} đề thi)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Trước
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2.5 text-xs"
              >
                Sau <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Admin Quiz Detail Preview Modal */}
      {previewQuizId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <Card className="max-w-3xl w-full p-6 shadow-2xl border-slate-200 bg-white space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Xem Trước Nội Dung Đề Thi (Admin Moderation)
                </h3>
              </div>
              <button
                onClick={() => setPreviewQuizId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {isDetailLoading ? (
                <div className="space-y-3">
                  <SkeletonLoader className="h-12 w-full rounded-md" />
                  <SkeletonLoader className="h-24 w-full rounded-md" />
                </div>
              ) : !detailData ? (
                <p className="text-xs text-slate-500">Không tìm thấy thông tin chi tiết.</p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">{detailData.quiz.title}</h4>
                    <div className="flex gap-4 text-slate-500">
                      <span>Phần thi: Part {detailData.quiz.part}</span>
                      <span>•</span>
                      <span>Tổng số: {detailData.questions.length} câu hỏi</span>
                      <span>•</span>
                      <span>Phiên bản: v{detailData.quiz.version}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Danh sách câu hỏi kiểm duyệt:
                    </h5>
                    {detailData.questions.map((q, idx) => (
                      <div key={q.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2">
                        <p className="font-semibold text-slate-900">
                          Câu {idx + 1}: {q.prompt}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] bg-slate-50 p-2 rounded">
                          <span>A: {q.choices.A}</span>
                          <span>B: {q.choices.B}</span>
                          <span>C: {q.choices.C}</span>
                          <span>D: {q.choices.D}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewQuizId(null)}>
                Đóng xem trước
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
