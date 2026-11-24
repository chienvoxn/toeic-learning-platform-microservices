import { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { BookOpen, RefreshCw } from 'lucide-react';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPart = Number(searchParams.get('part') || '0');
  const initialSkill = searchParams.get('skill')?.toUpperCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<number>(initialPart);
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');
  const [selectedSkill, setSelectedSkill] = useState<'ALL' | 'LISTENING' | 'READING'>(
    initialSkill === 'LISTENING' || initialSkill === 'READING' ? initialSkill : 'ALL'
  );

  // Sync state if query params change
  useEffect(() => {
    const p = Number(searchParams.get('part') || '0');
    setSelectedPart(p);
    const s = searchParams.get('skill')?.toUpperCase();
    if (s === 'LISTENING' || s === 'READING') {
      setSelectedSkill(s);
    }
  }, [searchParams]);

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

      let matchSkill = true;
      if (selectedSkill === 'LISTENING') {
        matchSkill = q.part >= 1 && q.part <= 4;
      } else if (selectedSkill === 'READING') {
        matchSkill = q.part >= 5 && q.part <= 7;
      }

      return matchQuery && matchPart && matchTier && matchSkill;
    });
  }, [quizzes, searchQuery, selectedPart, selectedTier, selectedSkill]);

  const handlePartChange = (part: number) => {
    setSelectedPart(part);
    if (part === 0) {
      searchParams.delete('part');
    } else {
      searchParams.set('part', String(part));
    }
    setSearchParams(searchParams);
  };

  const handleSkillChange = (skill: 'ALL' | 'LISTENING' | 'READING') => {
    setSelectedSkill(skill);
    setSelectedPart(0);
    searchParams.delete('part');
    if (skill === 'ALL') {
      searchParams.delete('skill');
    } else {
      searchParams.set('skill', skill.toLowerCase());
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/20 bg-blue-50/50">
              Ngân Hàng Đề Thi TOEIC
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kho Đề Thi TOEIC Master</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng hợp các bộ đề luyện tập chuẩn format quốc tế cập nhật từ giảng viên, phân loại rõ Listening & Reading.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>Tổng số: <strong>{quizzes.length}</strong> đề thi</span>
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
        selectedSkill={selectedSkill}
        onSkillChange={handleSkillChange}
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
          description={
            searchQuery || selectedPart !== 0 || selectedTier !== 'ALL' || selectedSkill !== 'ALL'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để hiển thị các đề thi khác.'
              : 'Hiện chưa có đề thi nào được xuất bản trong hệ thống.'
          }
          actionText="Đặt lại bộ lọc"
          onAction={() => {
            setSearchQuery('');
            setSelectedPart(0);
            setSelectedTier('ALL');
            setSelectedSkill('ALL');
            setSearchParams({});
          }}
        />
      )}

      {/* Quiz Grid */}
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
