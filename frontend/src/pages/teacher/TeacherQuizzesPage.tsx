import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { OwnedQuiz } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { SearchInput } from '@/components/molecules/SearchInput';
import { FilterButtonGroup } from '@/components/molecules/FilterButtonGroup';
import { Alert } from '@/components/molecules/Alert';
import { DataTable, Column } from '@/components/organisms/DataTable';
import {
  BookPlus,
  FileEdit,
  ExternalLink,
  Filter,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

export function TeacherQuizzesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [partFilter, setPartFilter] = useState<number | 'ALL'>('ALL');

  const {
    data: quizzes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OwnedQuiz[]>({
    queryKey: ['teacher-quizzes'],
    queryFn: () => apiRequest<OwnedQuiz[]>('/ms/v1/contents/quizzes/mine'),
    staleTime: 1000 * 30,
  });

  const statusCounts = useMemo(() => {
    const draft = quizzes.filter((q) => q.status === 'DRAFT').length;
    const published = quizzes.filter((q) => q.status === 'PUBLISHED').length;
    return {
      all: quizzes.length,
      draft,
      published,
    };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return quizzes.filter((q) => {
      const matchSearch = !query || q.title.toLowerCase().includes(query);
      const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
      const matchPart = partFilter === 'ALL' || q.part === partFilter;
      return matchSearch && matchStatus && matchPart;
    });
  }, [quizzes, searchTerm, statusFilter, partFilter]);

  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'ALL' || partFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPartFilter('ALL');
  };

  const columns: Column<OwnedQuiz>[] = [
    {
      key: 'title',
      header: 'Tiêu đề đề thi',
      render: (quiz) => (
        <div className="max-w-xs space-y-0.5">
          <span className="font-extrabold text-foreground block truncate" title={quiz.title}>
            {quiz.title}
          </span>
          <span className="font-mono text-[11px] text-ink-muted block truncate" title={quiz.id}>
            #{quiz.id.slice(0, 8)}
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
      header: 'Số câu hỏi',
      render: (quiz) => (
        <span className="font-mono font-bold text-foreground">{quiz.count} câu</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (quiz) => <StatusBadge status={quiz.status} />,
    },
    {
      key: 'version',
      header: 'Phiên bản',
      render: (quiz) => <span className="font-mono font-semibold text-ink-muted">v{quiz.version}</span>,
    },
    {
      key: 'actions',
      header: <span className="block text-right">Thao tác</span>,
      className: 'text-right',
      render: (quiz) => {
        const isDraft = quiz.status === 'DRAFT';
        return (
          <div className="flex flex-col items-end gap-1">
            {isDraft ? (
              <Link to={`/teacher/quizzes/${quiz.id}/edit`}>
                <Button variant="secondary" size="sm">
                  <FileEdit className="h-3.5 w-3.5" /> Chỉnh sửa đề
                </Button>
              </Link>
            ) : (
              <>
                <Link to={`/quizzes/${quiz.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Xem đề công khai
                  </Button>
                </Link>
                <span className="text-[11px] text-ink-muted">
                  Đề đã xuất bản không thể chỉnh sửa trực tiếp.
                </span>
              </>
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
          <h1 className="text-2xl font-black text-foreground tracking-tight">Kho đề thi của tôi</h1>
          <p className="text-sm text-ink-muted">
            Quản lý toàn bộ đề bản nháp và đề đã xuất bản thuộc quyền sở hữu giảng viên
          </p>
        </div>

        <Link to="/teacher/quizzes/new">
          <Button variant="primary" size="md">
            <BookPlus className="h-4 w-4" /> Tạo đề thi mới
          </Button>
        </Link>
      </div>

      {isError && (
        <Alert type="error" title="Không thể tải danh sách đề thi">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              {error instanceof Error
                ? error.message
                : 'Đã xảy ra lỗi khi kết nối kho đề thi giảng viên.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* Filter & Search Bar */}
      <Card variant="default" className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <FilterButtonGroup
            selectedValue={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'Tất cả', count: isLoading || isError ? undefined : statusCounts.all },
              { value: 'DRAFT', label: 'Bản nháp', count: isLoading || isError ? undefined : statusCounts.draft },
              {
                value: 'PUBLISHED',
                label: 'Đã xuất bản',
                count: isLoading || isError ? undefined : statusCounts.published,
              },
            ]}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <RotateCcw className="h-3.5 w-3.5" /> Đặt lại bộ lọc
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <SearchInput
              placeholder="Tìm kiếm theo tên đề thi..."
              value={searchTerm}
              onChange={setSearchTerm}
              aria-label="Tìm kiếm theo tên đề thi"
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              aria-label="Lọc theo phần thi TOEIC"
              value={partFilter === 'ALL' ? 'ALL' : String(partFilter)}
              onChange={(e) => setPartFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              options={[
                { value: 'ALL', label: 'Tất cả các Part (1–7)' },
                ...[1, 2, 3, 4, 5, 6, 7].map((p) => ({ value: String(p), label: `Part ${p}` })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Editorial Quiz Library Table */}
      {!isError && (
        <DataTable
          columns={columns}
          data={filteredQuizzes}
          keyExtractor={(quiz) => quiz.id}
          isLoading={isLoading}
          emptyIcon={Filter}
          emptyTitle={hasActiveFilters ? 'Không tìm thấy đề thi phù hợp' : 'Kho đề thi hiện đang trống'}
          emptyDescription={
            hasActiveFilters
              ? 'Thử điều chỉnh từ khóa tìm kiếm, trạng thái bản nháp/xuất bản hoặc bộ lọc Part.'
              : 'Khởi tạo bản nháp đầu tiên để bắt đầu xây dựng ngân hàng câu hỏi TOEIC.'
          }
          emptyActionText={hasActiveFilters ? 'Xóa bộ lọc' : 'Tạo đề thi mới'}
          onEmptyAction={hasActiveFilters ? handleResetFilters : () => navigate('/teacher/quizzes/new')}
        />
      )}
    </div>
  );
}
