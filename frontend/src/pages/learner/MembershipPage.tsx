import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { MembershipView } from '@/types/membership';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/feedback/Alert';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { 
  Award, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  Zap
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
        text: `Đã chuyển đổi thành công sang gói ${updated.planCode} (Hạn ngạch: ${updated.maxPracticePerDay} lượt/ngày)!`,
      });
      queryClient.invalidateQueries({ queryKey: ['learner-membership'] });
      queryClient.invalidateQueries({ queryKey: ['learner-membership-chip'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Không thể chuyển đổi gói hội viên. Tính năng demo có thể bị tắt trên máy chủ.';
      setActionMessage({
        type: 'error',
        text: message,
      });
    },
  });

  const isPro = membership?.planCode === 'PRO';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-6 w-36" />
        <SkeletonLoader className="h-48 w-full rounded-2xl" />
        <SkeletonLoader className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 py-8 text-center max-w-lg mx-auto">
        <Alert type="error" title="Không thể tải thông tin gói cước">
          {(error as Error)?.message || 'Lỗi kết nối đến dịch vụ Hội viên (Membership Service).'}
        </Alert>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-500" /> Quản Lý Gói Hội Viên
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Xem thông tin hạng tài khoản, giới hạn lượt luyện đề và thử nghiệm tính năng gói cước PRO.
        </p>
      </div>

      {/* Honest Demo Notification Alert */}
      <Alert type="info" title="Thông báo môi trường thử nghiệm (Demo Only)">
        <p className="text-xs leading-relaxed">
          Tính năng tự đổi gói bên dưới chỉ áp dụng trong môi trường Demo học tập để kiểm tra quyền hạn và giới hạn số lượt thi (Quota). Trong môi trường Production thực tế, quyền PRO được kích hoạt thông qua cổng thanh toán đã xác thực.
        </p>
      </Alert>

      {/* Action Feedback */}
      {actionMessage && (
        <Alert type={actionMessage.type} title={actionMessage.type === 'success' ? 'Thành công' : 'Không thể thực hiện'}>
          {actionMessage.text}
        </Alert>
      )}

      {/* Current Plan Overview Card */}
      <Card className="border-slate-200 bg-white p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Hạng gói tài khoản hiện tại:
          </span>
          <div className="flex items-center gap-3">
            <h3 className="text-3xl font-black text-slate-900">
              Gói {membership?.planCode}
            </h3>
            <Badge variant={isPro ? 'pro' : 'secondary'} className="text-xs py-1 px-3">
              {isPro ? 'Không giới hạn PRO' : 'Miễn phí cơ bản'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Hạn ngạch luyện tập tối đa: <strong className="text-slate-800">{membership?.maxPracticePerDay} lượt thi / ngày</strong>
          </p>
        </div>

        {/* Quick Demo Switcher Button */}
        <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
          {isPro ? (
            <Button
              variant="outline"
              className="text-xs font-semibold gap-2 border-slate-300"
              onClick={() => switchMutation.mutate('FREE')}
              isLoading={switchMutation.isPending}
            >
              Chuyển về gói FREE (Demo)
            </Button>
          ) : (
            <Button
              variant="primary"
              className="text-xs font-bold gap-2 shadow-sm"
              onClick={() => switchMutation.mutate('PRO')}
              isLoading={switchMutation.isPending}
            >
              <Sparkles className="h-4 w-4" /> Kích hoạt thử nghiệm PRO
            </Button>
          )}
        </div>
      </Card>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* FREE PLAN */}
        <Card className={`border p-6 flex flex-col justify-between ${!isPro ? 'border-primary ring-2 ring-primary/20 bg-white' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge variant="secondary">Cơ bản</Badge>
              {!isPro && <span className="text-xs font-bold text-primary">● Đang sử dụng</span>}
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">Gói FREE</h4>
              <p className="text-2xl font-black text-slate-900 mt-1">0 VNĐ</p>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>10 lượt làm bài mỗi ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Đề thi FREE tiêu chuẩn</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Lưu lịch sử bài thi</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button
              variant="outline"
              disabled={!isPro || switchMutation.isPending}
              onClick={() => switchMutation.mutate('FREE')}
              className="w-full text-xs font-semibold"
            >
              {!isPro ? 'Gói hiện tại của bạn' : 'Chuyển về FREE'}
            </Button>
          </div>
        </Card>

        {/* PRO PLAN */}
        <Card className={`border p-6 flex flex-col justify-between ${isPro ? 'border-primary ring-2 ring-primary/20 bg-white' : 'border-slate-200 bg-white'}`}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge variant="pro">Cao cấp</Badge>
              {isPro && <span className="text-xs font-bold text-primary">● Đang sử dụng</span>}
            </div>
            <div>
              <h4 className="text-xl font-bold text-primary">Gói PRO</h4>
              <p className="text-2xl font-black text-slate-900 mt-1">199.000 VNĐ <span className="text-xs font-normal text-slate-400">/ tháng (Demo)</span></p>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-100 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>1.000 lượt làm bài mỗi ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Mở khóa toàn bộ đề Premium</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Xem giải thích ngữ pháp chi tiết</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button
              variant="primary"
              disabled={isPro || switchMutation.isPending}
              onClick={() => switchMutation.mutate('PRO')}
              className="w-full text-xs font-bold gap-1.5 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              {isPro ? 'Gói hiện tại của bạn' : 'Kích hoạt thử nghiệm PRO'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
