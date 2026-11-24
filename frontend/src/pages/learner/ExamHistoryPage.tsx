import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { AttemptView } from '@/types/attempt';
import { QuizView } from '@/types/quiz';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { 
  History, 
  Search, 
  Calendar, 
  FileCheck, 
  ArrowRight, 
  Play
} from 'lucide-react';

export function ExamHistoryPage() {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'GRADED' | 'IN_PROGRESS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch user's attempts
  const { data: attempts = [], isLoading: isAttemptsLoading } = useQuery<AttemptView[]>({
    queryKey: ['learner-attempts'],
    queryFn: () => apiRequest<AttemptView[]>('/ms/v1/attempts'),
    staleTime: 1000 * 30,
  });

  // 2. Fetch quizzes catalog for title mapping
  const { data: quizzes = [] } = useQuery<QuizView[]>({
    queryKey: ['public-quizzes'],
    queryFn: () => apiRequest<QuizView[]>('/ms/v1/contents/quizzes'),
    staleTime: 1000 * 60 * 10,
  });

  const quizMap = useMemo(() => {
    const map = new Map<string, QuizView>();
    quizzes.forEach((q) => map.set(q.id, q));
    return map;
  }, [quizzes]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt) => {
      const matchStatus = filterStatus === 'ALL' || attempt.status === filterStatus;
      const quiz = quizMap.get(attempt.quizId);
      const title = quiz ? quiz.title : `Đề thi ${attempt.quizId}`;
      const matchSearch = !searchQuery.trim() || title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [attempts, filterStatus, searchQuery, quizMap]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Lịch Sử Luyện Đề
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi tất cả các bài thi bạn đã làm, xem lại điểm số và giải thích câu hỏi chi tiết.
          </p>
        </div>
        <Link to="/learner/quizzes">
          <Button variant="primary" size="sm" className="gap-1.5 font-bold shadow-xs">
            <Play className="h-4 w-4 fill-current" /> Luyện đề mới
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài thi..."
            className="pl-9 h-10 text-xs sm:text-sm"
          />
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start md:self-auto shrink-0">
          {(['ALL', 'GRADED', 'IN_PROGRESS'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-white text-primary shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'Tất cả bài' : status === 'GRADED' ? 'Đã chấm điểm' : 'Đang làm dở'}
            </button>
          ))}
        </div>
      </div>

      {/* History List Table / Cards */}
      {isAttemptsLoading ? (
        <div className="space-y-3">
          <SkeletonLoader className="h-20 w-full rounded-xl" />
          <SkeletonLoader className="h-20 w-full rounded-xl" />
          <SkeletonLoader className="h-20 w-full rounded-xl" />
        </div>
      ) : filteredAttempts.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bài thi nào"
          description={
            attempts.length === 0
              ? 'Bạn chưa làm bài thi nào. Bắt đầu luyện thi để ghi lại tiến độ học tập!'
              : 'Không có bài thi nào khớp với bộ lọc tìm kiếm của bạn.'
          }
          actionText={attempts.length === 0 ? 'Vào kho đề thi' : 'Đặt lại bộ lọc'}
          onAction={() => {
            if (attempts.length === 0) {
              window.location.href = '/learner/quizzes';
            } else {
              setSearchQuery('');
              setFilterStatus('ALL');
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredAttempts.map((attempt) => {
            const quiz = quizMap.get(attempt.quizId);
            const isGraded = attempt.status === 'GRADED';
            const percentage = isGraded && attempt.total > 0
              ? Math.round(((attempt.correct || 0) / attempt.total) * 100)
              : null;

            return (
              <Card
                key={attempt.id}
                className="p-5 border-slate-200 hover:border-primary/40 transition-all bg-white shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={attempt.status} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(attempt.createdAt).toLocaleDateString('vi-VN')} {new Date(attempt.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {quiz ? quiz.title : 'Đề luyện thi TOEIC'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mã lượt thi: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{attempt.id}</code>
                    </p>
                  </div>

                  {/* Score & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {isGraded ? (
                      <div className="text-right">
                        <div className="text-xl font-black text-slate-900">
                          {attempt.correct} <span className="text-sm font-normal text-slate-400">/ {attempt.total}</span>
                        </div>
                        <span className={`text-xs font-bold ${
                          (percentage || 0) >= 80 ? 'text-emerald-600' : (percentage || 0) >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {percentage}% chính xác
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-amber-600">Chưa nộp bài</span>
                        <p className="text-[11px] text-slate-400">{attempt.total} câu hỏi</p>
                      </div>
                    )}

                    <Link to={isGraded ? `/learner/results/${attempt.id}` : `/exam/${attempt.id}`}>
                      <Button
                        variant={isGraded ? 'outline' : 'primary'}
                        size="sm"
                        className="text-xs font-bold gap-1 shadow-xs"
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
