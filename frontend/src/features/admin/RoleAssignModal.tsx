import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { DirectoryUser, RbacAccess } from '@/types/admin';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/feedback/Alert';
import { Shield, CheckCircle2, X } from 'lucide-react';

interface RoleAssignModalProps {
  user: DirectoryUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleAssignModal({ user, isOpen, onClose, onSuccess }: RoleAssignModalProps) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<'LEARNER' | 'TEACHER' | 'ADMIN'>('TEACHER');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Chưa chọn người dùng');
      return apiRequest<RbacAccess>(`/ms/v1/identity/admin/users/${user.userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role: selectedRole }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] });
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gán vai trò';
      setErrorMessage(msg);
    },
  });

  if (!isOpen || !user) return null;

  const currentRoles = user.roles || [];
  const alreadyHasRole = currentRoles.includes(selectedRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <Card className="max-w-md w-full p-6 shadow-2xl border-slate-200 bg-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Phân Quyền Vai Trò Người Dùng</h3>
              <p className="text-xs text-slate-500">Gán vai trò mới cho tài khoản</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Summary Info */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Tên hiển thị:</span>
            <span className="font-bold text-slate-900">{user.displayName || '(Trống)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email:</span>
            <span className="font-mono text-slate-800">{user.email}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
            <span className="text-slate-500">Vai trò hiện tại:</span>
            <div className="flex gap-1">
              {currentRoles.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px] bg-white">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {errorMessage && (
          <Alert type="error" title="Lỗi thực hiện">
            {errorMessage}
          </Alert>
        )}

        {/* Role Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800">Chọn vai trò muốn cấp thêm:</label>
          <div className="space-y-2">
            {[
              {
                role: 'TEACHER' as const,
                title: 'Giảng viên (TEACHER)',
                desc: 'Có quyền tạo đề, soạn câu hỏi trắc nghiệm, nhập CSV và xuất bản đề thi.',
              },
              {
                role: 'ADMIN' as const,
                title: 'Quản trị viên (ADMIN)',
                desc: 'Có toàn quyền quản trị người dùng, gán vai trò và kiểm duyệt đề thi toàn hệ thống.',
              },
              {
                role: 'LEARNER' as const,
                title: 'Học viên (LEARNER)',
                desc: 'Vai trò mặc định để tham gia thi thử và xem lịch sử kết quả.',
              },
            ].map((opt) => (
              <label
                key={opt.role}
                onClick={() => setSelectedRole(opt.role)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedRole === opt.role
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelection"
                  checked={selectedRole === opt.role}
                  onChange={() => setSelectedRole(opt.role)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                    {currentRoles.includes(opt.role) && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Đã có
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {alreadyHasRole && (
          <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            Lưu ý: Người dùng này đã sở hữu vai trò <strong>{selectedRole}</strong>. Hệ thống sẽ giữ nguyên và xác nhận lại quyền.
          </p>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={grantMutation.isPending}
            onClick={() => grantMutation.mutate()}
          >
            {grantMutation.isPending ? 'Đang cấp quyền...' : `Xác nhận cấp vai trò ${selectedRole}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
