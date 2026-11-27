import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { QuizView } from '@/types/quiz';
import { QuizCard } from '@/features/catalog/QuizCard';
import { QuizFilters } from '@/features/catalog/QuizFilters';
import { QuizCardSkeleton } from '@/components/atoms/SkeletonLoader';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Alert } from '@/components/molecules/Alert';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
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
    staleTime: 1000 * 60 * 5,
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
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-border pb-6">
        <div className="space-y-2">
          <Badge variant="outline" className="font-mono uppercase tracking-wider">
            Ngân hàng đề thi TOEIC
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Kho đề thi TOEIC Master
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-2xl leading-relaxed">
            Danh mục đề luyện tập đã xuất bản, phân loại rõ theo kỹ năng Listening (Part 1–4), Reading (Part 5–7) và hạng gói FREE/PRO.
          </p>
        </div>

        {/* Truthful Status Counter: Never report 0 while loading or errored */}
        <div className="shrink-0">
          {isLoading ? (
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-foreground bg-muted px-3.5 py-2 rounded-sm border border-border">
              <BookOpen className="h-4 w-4" />
              <span>Đang tải danh mục...</span>
            </div>
          ) : isError ? (
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-foreground bg-destructive/40 px-3.5 py-2 rounded-sm border border-border">
              <BookOpen className="h-4 w-4" />
              <span>Không thể tải dữ liệu</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-foreground bg-surface px-3.5 py-2 rounded-sm border-[1.5px] border-border shadow-subtle">
              <BookOpen className="h-4 w-4" />
              <span>
                Hiển thị {filteredQuizzes.length} / {quizzes.length} đề thi
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
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
          <div className="space-y-3">
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
