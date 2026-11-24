import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { OwnedQuiz } from '@/types/quiz';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import {
  BookPlus,
  Search,
  FileEdit,
  ExternalLink,
  Filter
} from 'lucide-react';

export function TeacherQuizzesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [partFilter, setPartFilter] = useState<number | 'ALL'>('ALL');

  const { data: quizzes = [], isLoading } = useQuery<OwnedQuiz[]>({
    queryKey: ['teacher-quizzes'],
    queryFn: () => apiRequest<OwnedQuiz[]>('/ms/v1/contents/quizzes/mine'),
    staleTime: 1000 * 30,
  });

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
      const matchPart = partFilter === 'ALL' || q.part === partFilter;
      return matchSearch && matchStatus && matchPart;
    });
  }, [quizzes, searchTerm, statusFilter, partFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kho Đề Thi Của Tôi</h1>
          <p className="text-xs text-slate-500">Quản lý toàn bộ danh sách đề thi, trạng thái bản nháp và xuất bản</p>
        </div>

        <Link to="/teacher/quizzes/new">
          <Button variant="primary" className="shadow-xs font-bold text-xs">
            <BookPlus className="h-4 w-4 mr-2" /> Tạo đề thi mới
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm kiếm theo tiêu đề đề thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'DRAFT' | 'PUBLISHED')}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Chỉ bản nháp (Draft)</option>
              <option value="PUBLISHED">Đã xuất bản (Published)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Tất cả các Part (1-7)</option>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <option key={p} value={p}>Part {p}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Quiz Table / List */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <SkeletonLoader className="h-12 w-full rounded-md" />
            <SkeletonLoader className="h-12 w-full rounded-md" />
            <SkeletonLoader className="h-12 w-full rounded-md" />
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy đề thi phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Thử điều chỉnh lại từ khóa tìm kiếm hoặc bộ lọc trạng thái.
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
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredQuizzes.map((quiz) => {
                  const isDraft = quiz.status === 'DRAFT';
                  return (
                    <tr key={quiz.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {quiz.title}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        Part {quiz.part}
                      </td>
                      <td className="py-3.5 px-4">
                        {quiz.premium ? (
                          <Badge variant="pro" className="text-[10px]">PRO</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-600">FREE</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {quiz.count} câu
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={isDraft ? 'secondary' : 'default'} className="text-[10px]">
                          {isDraft ? 'Bản nháp (Draft)' : 'Đã xuất bản'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        v{quiz.version}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {isDraft ? (
                          <Link to={`/teacher/quizzes/${quiz.id}/edit`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                              <FileEdit className="h-3 w-3 mr-1" /> Biên tập
                            </Button>
                          </Link>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <Link to={`/quizzes/${quiz.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50">
                                <ExternalLink className="h-3 w-3 mr-1" /> Luyện thi thực tế
                              </Button>
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
