import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { UserDirectoryPage, AdminQuizzes } from '@/types/admin';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { Button } from '@/components/atoms/Button';
import { MetricCard } from '@/components/molecules/MetricCard';
import { Alert } from '@/components/molecules/Alert';
import { PageHeroBanner } from '@/components/organisms/PageHeroBanner';
import {
  Users,
  ShieldCheck,
  ArrowRight,
  Layers,
  FileCheck,
  FileEdit,
  RefreshCw,
} from 'lucide-react';

export function AdminDashboardPage() {
  // 1. Fetch Users Count (page=0 returns total across directory)
  const {
    data: usersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<UserDirectoryPage>({
    queryKey: ['admin-users-overview'],
    queryFn: () => apiRequest<UserDirectoryPage>('/ms/v1/identity/admin/users?page=0'),
    staleTime: 1000 * 60,
  });

  // 2. Fetch Global Quizzes (page=0 returns system total + first page sample)
  const {
    data: quizzesData,
    isLoading: isQuizzesLoading,
    isError: isQuizzesError,
    error: quizzesError,
    refetch: refetchQuizzes,
  } = useQuery<AdminQuizzes>({
    queryKey: ['admin-quizzes-overview'],
    queryFn: () => apiRequest<AdminQuizzes>('/ms/v1/contents/quizzes/admin?page=0'),
    staleTime: 1000 * 60,
  });

  const pageZeroQuizStats = useMemo(() => {
    if (isQuizzesError || !quizzesData) return null;
    const list = quizzesData.quizzes || [];
    const published = list.filter((q) => q.status === 'PUBLISHED').length;
    const drafts = list.filter((q) => q.status === 'DRAFT').length;
    return {
      sampleSize: list.length,
      published,
      drafts,
    };
  }, [quizzesData, isQuizzesError]);

  const isMultiPageQuizzes = Boolean(quizzesData && quizzesData.total > quizzesData.quizzes.length);

  return (
    <div className="space-y-8">
      {/* Editorial Header Banner (Light Orange Admin Identity) */}
      <PageHeroBanner
        badgeText="Trung tâm quản trị"
        title="Quản trị người dùng & kiểm duyệt đề thi"
        description="Tra cứu danh bạ tài khoản, cấp vai trò phân quyền RBAC và kiểm soát trạng thái hiển thị đề thi trên toàn hệ thống."
        className="border-l-warning"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/admin/quizzes">
              <Button variant="outline" size="md">
                <ShieldCheck className="h-4 w-4" /> Kiểm duyệt đề thi
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="primary" size="md">
                <Users className="h-4 w-4" /> Quản lý người dùng
              </Button>
            </Link>
          </div>
        }
      />

      {(isUsersError || isQuizzesError) && (
        <Alert type="error" title="Không thể tải đầy đủ dữ liệu quản trị">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              {isUsersError && usersError instanceof Error
                ? `Danh bạ người dùng: ${usersError.message}. `
                : isUsersError
                  ? 'Lỗi tải danh bạ người dùng. '
                  : ''}
              {isQuizzesError && quizzesError instanceof Error
                ? `Kho đề thi: ${quizzesError.message}.`
                : isQuizzesError
                  ? 'Lỗi tải dữ liệu kho đề thi.'
                  : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isUsersError) refetchUsers();
                if (isQuizzesError) refetchQuizzes();
              }}
              className="shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* Metrics Row (Truthful totals & explicit page-0 scope) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Tổng số tài khoản"
          value={!isUsersError && usersData ? usersData.total : '—'}
          subtitle="Tài khoản đã đăng ký toàn hệ thống"
          icon={Users}
          colorScheme="amber"
          isLoading={isUsersLoading}
        />
        <MetricCard
          title="Tổng số đề thi"
          value={!isQuizzesError && quizzesData ? quizzesData.total : '—'}
          subtitle="Bao gồm tất cả đề nháp và đã xuất bản"
          icon={Layers}
          colorScheme="indigo"
          isLoading={isQuizzesLoading}
        />
        <MetricCard
          title="Đã xuất bản (trang đầu)"
          value={pageZeroQuizStats ? pageZeroQuizStats.published : '—'}
          subtitle={
            pageZeroQuizStats
              ? isMultiPageQuizzes
                ? `Chỉ tính trên ${pageZeroQuizStats.sampleSize} đề ở trang đầu (page 0)`
                : `Trong ${pageZeroQuizStats.sampleSize} đề hiện có`
              : 'Phạm vi trang đầu (page 0)'
          }
          icon={FileCheck}
          colorScheme="emerald"
          isLoading={isQuizzesLoading}
        />
        <MetricCard
          title="Bản nháp (trang đầu)"
          value={pageZeroQuizStats ? pageZeroQuizStats.drafts : '—'}
          subtitle={
            pageZeroQuizStats
              ? isMultiPageQuizzes
                ? `Chỉ tính trên ${pageZeroQuizStats.sampleSize} đề ở trang đầu (page 0)`
                : `Trong ${pageZeroQuizStats.sampleSize} đề hiện có`
              : 'Phạm vi trang đầu (page 0)'
          }
          icon={FileEdit}
          colorScheme="blue"
          isLoading={isQuizzesLoading}
        />
      </div>

      {/* Quick Actions & First-Page Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User RBAC Management Card */}
        <Card variant="default" className="p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-border/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-warning/50 border border-border text-foreground shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">
                    Danh bạ người dùng &amp; phân quyền
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Tra cứu tài khoản theo tên hoặc email và cấp vai trò RBAC
                  </p>
                </div>
              </div>
              {usersData && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {usersData.total} tài khoản
                </Badge>
              )}
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Quản trị viên có thể cấp vai trò <strong className="text-foreground">LEARNER</strong>,{' '}
              <strong className="text-foreground">TEACHER</strong> hoặc{' '}
              <strong className="text-foreground">ADMIN</strong>. Tài khoản được cấp quyền cần đăng nhập lại để nhận token mới.
            </p>

            {usersData && usersData.users.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                  Một số tài khoản trang đầu
                </span>
                <div className="divide-y divide-border/20 border border-border rounded-md bg-background">
                  {usersData.users.slice(0, 3).map((u) => (
                    <div key={u.userId} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{u.displayName || '(Chưa đặt tên)'}</p>
                        <p className="font-mono text-[11px] text-ink-muted truncate">{u.email}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === 'ADMIN' ? 'warning' : 'outline'} className="text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link to="/admin/users">
              <Button variant="outline" size="md" className="w-full justify-between">
                <span>Mở danh bạ người dùng &amp; phân quyền</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Quiz Moderation Card */}
        <Card variant="default" className="p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-border/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-success/50 border border-border text-foreground shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">
                    Kiểm duyệt &amp; ẩn/hiện đề thi
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Theo dõi đề thi của tất cả giảng viên và kiểm soát trạng thái công khai
                  </p>
                </div>
              </div>
              {quizzesData && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {quizzesData.total} đề thi
                </Badge>
              )}
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Xem trước câu hỏi chi tiết từng đề thi, gỡ hiển thị đề chưa đạt chuẩn hoặc xuất bản đề đủ điều kiện với khóa phiên bản đồng thời.
            </p>

            {quizzesData && quizzesData.quizzes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                  Đề thi ở trang đầu (page 0)
                </span>
                <div className="divide-y divide-border/20 border border-border rounded-md bg-background">
                  {quizzesData.quizzes.slice(0, 3).map((q) => (
                    <div key={q.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{q.title}</p>
                        <p className="font-mono text-[11px] text-ink-muted">
                          Part {q.part} • {q.count} câu • v{q.version}
                        </p>
                      </div>
                      <StatusBadge status={q.status} className="shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link to="/admin/quizzes">
              <Button variant="outline" size="md" className="w-full justify-between">
                <span>Mở trang kiểm duyệt kho đề thi</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
