import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { QuizView } from '@/types/quiz';
import { QuizCard } from '@/features/catalog/QuizCard';
import { QuizFilters } from '@/features/catalog/QuizFilters';
import { QuizCardSkeleton } from '@/components/feedback/SkeletonLoader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/button';
import { BookOpen, RefreshCw } from 'lucide-react';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPart = Number(searchParams.get('part') || '0');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<number>(initialPart);
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');

  // Fetch Public Quizzes from Content Service
  const {
    data: quizzes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<QuizView[]>({
    queryKey: ['public-quizzes'],
    queryFn: () => apiRequest<QuizView[]>('/ms/v1/contents/quizzes'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter quizzes client-side
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchQuery = !searchQuery.trim() || q.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchPart = selectedPart === 0 || q.part === selectedPart;
      const matchTier =
        selectedTier === 'ALL' ||
        (selectedTier === 'FREE' && !q.premium) ||
        (selectedTier === 'PRO' && q.premium);

      return matchQuery && matchPart && matchTier;
    });
  }, [quizzes, searchQuery, selectedPart, selectedTier]);

  const handlePartChange = (part: number) => {
    setSelectedPart(part);
    if (part === 0) {
      searchParams.delete('part');
    } else {
      searchParams.set('part', String(part));
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kho Đề Thi TOEIC</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng hợp các bộ đề luyện tập chuẩn format ETS, cập nhật liên tục từ giảng viên.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>Tổng số: {quizzes.length} đề thi</span>
        </div>
      </div>

      {/* Filter Component */}
      <QuizFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPart={selectedPart}
        onPartChange={handlePartChange}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
      />

      {/* Error State */}
      {isError && (
        <Alert type="error" title="Không thể tải danh sách đề thi">
          <div className="space-y-2">
            <p>{(error as Error)?.message || 'Đã xảy ra lỗi khi kết nối với máy chủ nội dung.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading Skeleton Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <QuizCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredQuizzes.length === 0 && (
        <EmptyState
          title="Không tìm thấy đề thi phù hợp"
          description="Thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại bộ lọc theo Part hoặc Gói cước."
          actionText="Đặt lại bộ lọc"
          onAction={() => {
            setSearchQuery('');
            handlePartChange(0);
            setSelectedTier('ALL');
          }}
        />
      )}

      {/* Quizzes Grid */}
      {!isLoading && !isError && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
}
