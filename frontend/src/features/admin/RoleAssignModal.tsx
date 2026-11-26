import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { DirectoryUser, RbacAccess } from '@/types/admin';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/Dialog';
import { Alert } from '@/components/molecules/Alert';
import { Shield } from 'lucide-react';

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

  if (!user) return null;

  const currentRoles = user.roles || [];
  const alreadyHasRole = currentRoles.includes(selectedRole);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Phân Quyền Vai Trò Người Dùng</DialogTitle>
              <DialogDescription>Gán vai trò mới cho tài khoản</DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
                desc: 'Có quyền khởi tạo, chỉnh sửa bản nháp và xuất bản đề thi TOEIC.',
              },
              {
                role: 'ADMIN' as const,
                title: 'Quản trị viên (ADMIN)',
                desc: 'Toàn quyền kiểm duyệt đề thi, cấp/thu hồi vai trò toàn hệ thống.',
              },
              {
                role: 'LEARNER' as const,
                title: 'Học viên (LEARNER)',
                desc: 'Quyền làm bài thi, lưu đáp án và xem kết quả giải chi tiết.',
              },
            ].map((item) => (
              <label
                key={item.role}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedRole === item.role
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelection"
                  value={item.role}
                  checked={selectedRole === item.role}
                  onChange={() => setSelectedRole(item.role)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">{item.title}</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {alreadyHasRole && (
            <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Lưu ý: Người dùng này đã sở hữu vai trò <strong>{selectedRole}</strong>. Hệ thống sẽ giữ nguyên và xác nhận lại quyền.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={grantMutation.isPending}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => grantMutation.mutate()}
            isLoading={grantMutation.isPending}
          >
            {grantMutation.isPending ? 'Đang cấp quyền...' : `Xác nhận cấp vai trò ${selectedRole}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
