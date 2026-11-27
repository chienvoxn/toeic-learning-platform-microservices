import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { MembershipView } from '@/types/membership';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { SkeletonLoader } from '@/components/atoms/SkeletonLoader';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/atoms/Table';
import { Alert } from '@/components/molecules/Alert';
import {
  Award,
  Check,
  Minus,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';

export function MembershipPage() {
  const queryClient = useQueryClient();
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch current membership details
  const {
    data: membership,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MembershipView>({
    queryKey: ['learner-membership'],
    queryFn: () => apiRequest<MembershipView>('/api/v1/memberships/me'),
    staleTime: 1000 * 60 * 2,
  });

  // 2. Demo Plan Switch Mutation (PUT /api/v1/memberships/me)
  const switchMutation = useMutation({
    mutationFn: (newPlanCode: 'FREE' | 'PRO') =>
      apiRequest<MembershipView>('/api/v1/memberships/me', {
        method: 'PUT',
        body: JSON.stringify({ planCode: newPlanCode }),
      }),
    onSuccess: (updated) => {
      setActionMessage({
        type: 'success',
        text: `Đã chuyển đổi thành công sang gói ${updated.planCode} (hạn ngạch: ${updated.maxPracticePerDay} lượt/ngày).`,
      });
      queryClient.invalidateQueries({ queryKey: ['learner-membership'] });
      queryClient.invalidateQueries({ queryKey: ['learner-membership-chip'] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể chuyển đổi gói hội viên. Tính năng đổi gói thử nghiệm (ALLOW_DEMO_PLAN_CHANGE) có thể đang tắt trên hệ thống.';
      setActionMessage({
        type: 'error',
        text: message,
      });
    },
  });

  const isPro = membership?.planCode === 'PRO';

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <SkeletonLoader className="h-8 w-56" />
        <SkeletonLoader className="h-44 w-full" />
        <SkeletonLoader className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 py-8 max-w-lg mx-auto">
        <Alert type="error" title="Không thể tải thông tin gói hội viên">
          {(error as Error)?.message || 'Không thể kết nối để đọc trạng thái gói tài khoản của bạn.'}
        </Alert>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="space-y-1.5 border-b-2 border-border pb-5">
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
          <Award className="h-6 w-6 shrink-0" /> Quản lý gói hội viên
        </h2>
        <p className="text-sm text-ink-muted">
          Kiểm tra hạng tài khoản hiện tại, hạn ngạch lượt luyện đề mỗi ngày và chuyển đổi gói trong môi trường thử nghiệm.
        </p>
      </div>

      {/* Transparent Demo Environment Alert (Synced with PricingPage) */}
      <Alert type="warning" title="Môi trường thử nghiệm &amp; chính sách gói tài khoản (Demo)">
        <p className="text-sm leading-relaxed">
          Hệ thống hiện tại là nền tảng học tập thử nghiệm,{' '}
          <strong>chưa tích hợp cổng thanh toán và không thu bất kỳ khoản phí thực tế nào</strong>. Mức giá
          199.000 VNĐ/tháng chỉ mang tính mô phỏng. Khi cấu hình <code>ALLOW_DEMO_PLAN_CHANGE</code> được bật, bạn có
          thể chuyển đổi qua lại giữa gói FREE (10 lượt/ngày) và gói PRO (1.000 lượt/ngày) ngay bên dưới.
        </p>
      </Alert>

      {/* Action Feedback */}
      {actionMessage && (
        <Alert type={actionMessage.type} title={actionMessage.type === 'success' ? 'Cập nhật thành công' : 'Không thể chuyển gói'}>
          {actionMessage.text}
        </Alert>
      )}

      {/* Current Membership Dossier */}
      <Card variant="elevated" className="p-0 overflow-hidden">
        <div className="bg-background border-b-2 border-border px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Trạng thái tài khoản hiện tại
          </span>
          <Badge variant={isPro ? 'pro' : 'outline'}>
            {isPro ? 'PRO · Hạn ngạch mở rộng' : 'FREE · Tiêu chuẩn'}
          </Badge>
        </div>

        <div className="p-6 sm:p-8 bg-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-3xl font-black text-foreground">Gói {membership?.planCode}</h3>
              <Badge variant={isPro ? 'success' : 'secondary'}>
                {membership?.status || 'ACTIVE'}
              </Badge>
            </div>
            <p className="text-sm text-ink-muted">
              Hạn ngạch tạo bài luyện tập mới:{' '}
              <strong className="font-mono text-foreground">
                {membership?.maxPracticePerDay} lượt / ngày
              </strong>{' '}
              (làm mới lúc 00:00 UTC).
            </p>
            <p className="text-xs text-ink-muted">
              Quyền truy cập kho đề:{' '}
              <strong className="text-foreground">
                {isPro ? 'Toàn bộ đề FREE và đề chuyên sâu PRO' : 'Toàn bộ đề tiêu chuẩn FREE'}
              </strong>
              .
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            {isPro ? (
              <Button
                variant="outline"
                size="md"
                className="w-full md:w-auto gap-2"
                onClick={() => switchMutation.mutate('FREE')}
                isLoading={switchMutation.isPending}
              >
                Chuyển về gói FREE (Demo)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="w-full md:w-auto gap-2"
                onClick={() => switchMutation.mutate('PRO')}
                isLoading={switchMutation.isPending}
              >
                <Sparkles className="h-4 w-4" /> Kích hoạt PRO thử nghiệm
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Plans Selection Cards (Synced with PricingPage) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* FREE PLAN */}
        <Card variant={!isPro ? 'elevated' : 'default'} className="p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-background border-b-[1.5px] border-border px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Gói cơ bản
              </span>
              {!isPro ? (
                <Badge variant="success">Đang sử dụng</Badge>
              ) : (
                <Badge variant="outline" className="font-mono">
                  FREE
                </Badge>
              )}
            </div>

            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black text-foreground">Gói FREE</CardTitle>
              <div className="font-mono text-3xl font-black text-foreground pt-2">
                0 VNĐ <span className="font-sans text-xs font-medium text-ink-muted">/ mặc định</span>
              </div>
              <CardDescription className="pt-1">
                Phù hợp cho học viên làm quen với cấu trúc 7 phần thi và luyện tập hằng ngày.
              </CardDescription>
            </CardHeader>

            <div className="px-6 pb-6 space-y-3 text-sm text-foreground">
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Tối đa <strong className="font-mono">10 lượt/ngày</strong> tạo bài luyện tập mới
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Truy cập toàn bộ đề thi gắn nhãn FREE</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Tự động lưu đáp án, chấm điểm và lưu lịch sử thi</span>
              </div>
            </div>
          </div>

          <CardFooter className="pt-0">
            <Button
              variant="outline"
              disabled={!isPro || switchMutation.isPending}
              onClick={() => switchMutation.mutate('FREE')}
              isLoading={switchMutation.isPending && isPro}
              className="w-full"
            >
              {!isPro ? 'Đang sử dụng gói này' : 'Chuyển về gói FREE (Demo)'}
            </Button>
          </CardFooter>
        </Card>

        {/* PRO PLAN */}
        <Card variant={isPro ? 'elevated' : 'default'} className="p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-primary border-b-2 border-border px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                Hạn ngạch mở rộng
              </span>
              {isPro ? (
                <Badge variant="success">Đang sử dụng</Badge>
              ) : (
                <Badge variant="outline" className="font-mono bg-surface">
                  1.000 LƯỢT / NGÀY
                </Badge>
              )}
            </div>

            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black text-foreground">Gói PRO</CardTitle>
              <div className="font-mono text-3xl font-black text-foreground pt-2">
                199.000 VNĐ{' '}
                <span className="font-sans text-xs font-medium text-ink-muted">/ tháng (Giá mô phỏng)</span>
              </div>
              <CardDescription className="pt-1">
                Mở khóa toàn bộ đề thi nâng cao và tăng hạn ngạch lên 1.000 lượt luyện tập mỗi ngày (kích hoạt thử
                nghiệm miễn phí).
              </CardDescription>
            </CardHeader>

            <div className="px-6 pb-6 space-y-3 text-sm text-foreground">
              <div className="flex items-start gap-2.5 font-semibold">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Tối đa <strong className="font-mono">1.000 lượt/ngày</strong> tạo bài luyện tập mới
                </span>
              </div>
              <div className="flex items-start gap-2.5 font-semibold">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Mở khóa toàn bộ đề thi gắn nhãn PRO và FREE</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Xem giải thích chi tiết từng câu sau khi bài thi được chấm</span>
              </div>
            </div>
          </div>

          <CardFooter className="pt-0">
            <Button
              variant="primary"
              disabled={isPro || switchMutation.isPending}
              onClick={() => switchMutation.mutate('PRO')}
              isLoading={switchMutation.isPending && !isPro}
              className="w-full gap-1.5"
            >
              <Zap className="h-4 w-4" />
              {isPro ? 'Đang sử dụng gói này' : 'Kích hoạt PRO thử nghiệm'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Feature Comparison Table (Synced with PricingPage) */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-foreground">Bảng đối chiếu quyền lợi tài khoản</h3>
        <Card variant="flat" className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted">
                <TableHead>Quyền lợi trong hệ thống</TableHead>
                <TableHead className="text-center w-36">Gói FREE</TableHead>
                <TableHead className="text-center w-44 bg-primary/40">Gói PRO (Mô phỏng)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Giới hạn lượt thi mới mỗi ngày (UTC)</TableCell>
                <TableCell className="text-center font-mono font-bold">10 lượt</TableCell>
                <TableCell className="text-center font-mono font-black bg-primary/15">1.000 lượt</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Truy cập đề thi tiêu chuẩn (FREE)</TableCell>
                <TableCell className="text-center font-bold">Có</TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Có</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Truy cập đề thi chuyên sâu (PRO)</TableCell>
                <TableCell className="text-center text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Minus className="h-4 w-4" /> Không
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Mở khóa toàn bộ</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Lưu đáp án tự động &amp; xem lời giải sau khi nộp</TableCell>
                <TableCell className="text-center font-bold">Có</TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Có</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
