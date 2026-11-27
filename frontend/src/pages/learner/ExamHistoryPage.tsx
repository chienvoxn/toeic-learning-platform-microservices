import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { QuizView } from '@/types/quiz';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Select } from '@/components/atoms/Select';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import { SearchInput } from '@/components/molecules/SearchInput';
import { FilterButtonGroup } from '@/components/molecules/FilterButtonGroup';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Alert } from '@/components/molecules/Alert';
import {
  History,
  Calendar,
  FileCheck,
  ArrowRight,
  Play,
  RefreshCw,
} from 'lucide-react';

export function ExamHistoryPage() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'GRADED' | 'IN_PROGRESS'>('ALL');
  const [selectedPart, setSelectedPart] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch user's attempts
  const {
    data: attempts = [],
    isLoading: isAttemptsLoading,
    isError: isAttemptsError,
    refetch,
  } = useQuery<AttemptView[]>({
    queryKey: ['learner-attempts'],
    queryFn: () => apiRequest<AttemptView[]>('/ms/v1/attempts'),
    staleTime: 1000 * 30,
  });

  // 2. Fetch quizzes catalog for title & part mapping
  const {
    data: quizzes = [],
    isLoading: isQuizzesLoading,
    isError: isQuizzesError,
  } = useQuery<QuizView[]>({
    queryKey: ['public-quizzes'],
    queryFn: () => apiRequest<QuizView[]>('/ms/v1/contents/quizzes'),
    staleTime: 1000 * 60 * 10,
  });

  const quizMap = useMemo(() => {
    const map = new Map<string, QuizView>();
    quizzes.forEach((q) => map.set(q.id, q));
    return map;
  }, [quizzes]);

  const getAttemptDisplayTitle = (attempt: AttemptView, quiz?: QuizView): string =>
    quiz ? quiz.title : `Đề luyện thi TOEIC #${attempt.quizId.slice(0, 8)}`;

  const counts = useMemo(() => {
    const graded = attempts.filter((a) => a.status === 'GRADED').length;
    const inProgress = attempts.filter((a) => a.status === 'IN_PROGRESS').length;
    return { all: attempts.length, graded, inProgress };
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt) => {
      const matchStatus = filterStatus === 'ALL' || attempt.status === filterStatus;
      const quiz = quizMap.get(attempt.quizId);
      const matchPart = selectedPart === 0 || quiz?.part === selectedPart;
      const displayTitle = getAttemptDisplayTitle(attempt, quiz);
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const cleanIdQuery = normalizedQuery.replace(/^#/, '');
      const matchSearch =
        !normalizedQuery ||
        displayTitle.toLowerCase().includes(normalizedQuery) ||
        (cleanIdQuery.length > 0 && attempt.id.toLowerCase().includes(cleanIdQuery));
      return matchStatus && matchPart && matchSearch;
    });
  }, [attempts, filterStatus, selectedPart, searchQuery, quizMap]);

  const partOptions = [
    { value: 0, label: 'Tất cả các Part (1–7)' },
    { value: 1, label: 'Part 1: Photographs' },
    { value: 2, label: 'Part 2: Question-Response' },
    { value: 3, label: 'Part 3: Conversations' },
    { value: 4, label: 'Part 4: Short Talks' },
    { value: 5, label: 'Part 5: Incomplete Sentences' },
    { value: 6, label: 'Part 6: Text Completion' },
    { value: 7, label: 'Part 7: Reading Comprehension' },
  ];

  const statusOptions = [
    { value: 'ALL' as const, label: `Tất cả (${counts.all})` },
    { value: 'GRADED' as const, label: `Đã chấm (${counts.graded})` },
    { value: 'IN_PROGRESS' as const, label: `Đang làm (${counts.inProgress})` },
  ];

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-2 border-border pb-5">
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <History className="h-6 w-6 shrink-0" /> Lịch sử luyện đề
          </h2>
          <p className="text-sm text-ink-muted">
            Theo dõi toàn bộ lượt làm bài, lọc theo trạng thái chấm điểm hoặc Part và mở lại lời giải chi tiết.
          </p>
        </div>

        <Link to="/learner/quizzes" className="shrink-0">
          <Button variant="primary" size="md" className="gap-1.5">
            <Play className="h-4 w-4 fill-current" /> Luyện đề mới
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <Card variant="default" className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/20">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Trạng thái bài thi
          </span>
          <FilterButtonGroup
            options={statusOptions}
            selectedValue={filterStatus}
            onChange={setFilterStatus}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm theo tên đề thi..."
            />
          </div>

          <div className="w-full lg:w-72 shrink-0">
            <Select
              aria-label="Lọc theo Part"
              value={selectedPart}
              onChange={(e) => setSelectedPart(Number(e.target.value))}
              options={partOptions}
            />
          </div>
        </div>
      </Card>

      {/* Error State */}
      {isAttemptsError ? (
        <Alert type="error" title="Không thể tải lịch sử luyện đề">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Đã xảy ra lỗi khi truy xuất danh sách lượt làm bài của bạn.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 shrink-0">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      ) : isAttemptsLoading ? (
        <div className="space-y-3">
          <SkeletonLoader className="h-24 w-full" />
          <SkeletonLoader className="h-24 w-full" />
          <SkeletonLoader className="h-24 w-full" />
        </div>
      ) : filteredAttempts.length === 0 ? (
        <EmptyState
          icon={History}
          title="Không tìm thấy lượt làm bài phù hợp"
          description={
            attempts.length === 0
              ? 'Bạn chưa thực hiện bài thi nào. Hãy chọn một đề thi từ kho đề để bắt đầu luyện tập.'
              : 'Không có bài thi nào khớp với từ khóa hoặc bộ lọc hiện tại.'
          }
          actionText={attempts.length === 0 ? 'Vào kho đề thi' : 'Đặt lại bộ lọc'}
          onAction={() => {
            if (attempts.length === 0) {
              navigate('/learner/quizzes');
            } else {
              setSearchQuery('');
              setFilterStatus('ALL');
              setSelectedPart(0);
            }
          }}
        />
      ) : (
        /* Responsive Editorial Practice Ledger */
        <div className="border-2 border-border rounded-lg bg-surface shadow-brutal-sm overflow-hidden">
          {/* Desktop Column Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 bg-muted border-b-2 border-border px-6 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-5">Đề thi &amp; phân loại</div>
            <div className="col-span-3">Ngày luyện tập</div>
            <div className="col-span-2 text-right">Kết quả</div>
            <div className="col-span-2 text-right">Thao tác</div>
          </div>

          <div className="divide-y-[1.5px] divide-border">
            {filteredAttempts.map((attempt) => {
              const quiz = quizMap.get(attempt.quizId);
              const isGraded = attempt.status === 'GRADED';
              const percentage =
                isGraded && attempt.total > 0
                  ? Math.round(((attempt.correct || 0) / attempt.total) * 100)
                  : null;

              return (
                <div
                  key={attempt.id}
                  className="p-4 sm:px-6 sm:py-4 hover:bg-background/60 transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-start md:items-center"
                >
                  {/* Column 1: Title, Status, Part */}
                  <div className="md:col-span-5 space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={attempt.status} />
                      {quiz ? (
                        <Badge variant="outline" className="font-mono text-[11px]">
                          Part {quiz.part}
                        </Badge>
                      ) : isQuizzesLoading ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Đang tải thông tin đề...
                        </Badge>
                      ) : isQuizzesError ? (
                        <Badge variant="warning" className="text-[11px]">
                          Chưa đồng bộ danh mục đề
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          Thông tin đề thi không khả dụng
                        </Badge>
                      )}
                      <span className="font-mono text-[11px] text-ink-muted">
                        #{attempt.id.slice(0, 8)}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                      {getAttemptDisplayTitle(attempt, quiz)}
                    </h3>
                  </div>

                  {/* Column 2: Date & Time */}
                  <div className="md:col-span-3 flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {new Date(attempt.createdAt).toLocaleDateString('vi-VN')} ·{' '}
                      {new Date(attempt.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Column 3: Score / Progress */}
                  <div className="md:col-span-2 flex items-center justify-between md:block md:text-right w-full pt-2 md:pt-0 border-t md:border-t-0 border-border/20">
                    <span className="md:hidden text-xs font-bold text-ink-muted">Kết quả:</span>
                    {isGraded ? (
                      <div className="text-right">
                        <div className="font-mono text-base font-black text-foreground">
                          {attempt.correct ?? 0}
                          <span className="text-xs font-semibold text-ink-muted">/{attempt.total}</span>
                        </div>
                        {percentage !== null && (
                          <span className="font-mono text-xs font-bold text-ink-muted">
                            {percentage}% chính xác
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-bold text-foreground">Chưa nộp bài</span>
                        <p className="font-mono text-[11px] text-ink-muted">{attempt.total} câu hỏi</p>
                      </div>
                    )}
                  </div>

                  {/* Column 4: Action CTA */}
                  <div className="md:col-span-2 flex justify-end w-full">
                    <Link
                      to={isGraded ? `/learner/results/${attempt.id}` : `/exam/${attempt.id}`}
                      className="w-full md:w-auto"
                    >
                      <Button
                        variant={isGraded ? 'outline' : 'primary'}
                        size="sm"
                        className="w-full md:w-auto gap-1.5"
                      >
                        {isGraded ? (
                          <>
                            <FileCheck className="h-3.5 w-3.5" /> Xem kết quả
                          </>
                        ) : (
                          <>
                            Làm tiếp <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
