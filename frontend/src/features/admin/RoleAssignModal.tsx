import { useState, useEffect, useRef } from 'react';
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
import { cn } from '@/lib/utils';

interface RoleAssignModalProps {
  user: DirectoryUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AssignableRole = 'LEARNER' | 'TEACHER' | 'ADMIN';

export function RoleAssignModal({ user, isOpen, onClose, onSuccess }: RoleAssignModalProps) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('TEACHER');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeUserIdRef.current = isOpen && user ? user.userId : null;
  }, [isOpen, user]);

  // Reset selected role and errors whenever modal opens or target user changes
  useEffect(() => {
    if (isOpen) {
      setSelectedRole('TEACHER');
      setErrorMessage(null);
    }
  }, [isOpen, user?.userId]);

  const grantMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AssignableRole }) => {
      return apiRequest<RbacAccess>(`/ms/v1/identity/admin/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] });
      if (activeUserIdRef.current !== variables.userId) return;
      setErrorMessage(null);
      onSuccess();
      onClose();
    },
    onError: (err: unknown, variables) => {
      if (activeUserIdRef.current !== variables.userId) return;
      const msg = err instanceof Error ? err.message : 'Lỗi khi gán vai trò';
      setErrorMessage(msg);
    },
  });

  if (!user) return null;

  const currentRoles = user.roles || [];
  const alreadyHasRole = currentRoles.includes(selectedRole);

  const handleConfirmGrant = () => {
    if (grantMutation.isPending) return;
    grantMutation.mutate({ userId: user.userId, role: selectedRole });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !grantMutation.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-warning/50 border border-border text-foreground shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Phân quyền vai trò người dùng</DialogTitle>
              <DialogDescription>Cấp thêm vai trò mới cho tài khoản được chọn</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User Summary Info */}
        <div className="bg-background p-3.5 rounded-md border-[1.5px] border-border space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-ink-muted font-medium">Tên hiển thị:</span>
            <span className="font-extrabold text-foreground truncate">{user.displayName || '(Trống)'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink-muted font-medium">Email:</span>
            <span className="font-mono text-foreground truncate">{user.email}</span>
          </div>
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/20">
            <span className="text-ink-muted font-medium">Vai trò hiện tại:</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {currentRoles.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px]">
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
        <div className="space-y-2.5">
          <span className="text-xs font-extrabold text-foreground block">Chọn vai trò muốn cấp thêm:</span>
          <div className="space-y-2">
            {[
              {
                role: 'TEACHER' as const,
                title: 'Giảng viên (TEACHER)',
                desc: 'Khởi tạo, chỉnh sửa bản nháp, nhập CSV và xuất bản đề thi TOEIC.',
              },
              {
                role: 'ADMIN' as const,
                title: 'Quản trị viên (ADMIN)',
                desc: 'Kiểm duyệt kho đề thi và cấp vai trò người dùng trên toàn hệ thống.',
              },
              {
                role: 'LEARNER' as const,
                title: 'Học viên (LEARNER)',
                desc: 'Thực hành làm bài thi, lưu đáp án và xem kết quả giải chi tiết.',
              },
            ].map((item) => {
              const isSelected = selectedRole === item.role;
              return (
                <label
                  key={item.role}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border-[1.5px] cursor-pointer transition-colors',
                    isSelected
                      ? 'border-border bg-warning/35 shadow-subtle'
                      : 'border-border/50 bg-surface hover:bg-muted',
                    grantMutation.isPending && 'opacity-60 pointer-events-none'
                  )}
                >
                  <input
                    type="radio"
                    name="roleSelection"
                    value={item.role}
                    checked={isSelected}
                    disabled={grantMutation.isPending}
                    onChange={() => setSelectedRole(item.role)}
                    className="mt-0.5 h-4 w-4 accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold text-foreground">{item.title}</div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">{item.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {alreadyHasRole && (
            <p className="text-xs text-foreground bg-warning/45 p-2.5 rounded-md border border-border leading-relaxed">
              Lưu ý: Người dùng này đã sở hữu vai trò <strong>{selectedRole}</strong>. Hệ thống sẽ giữ nguyên và xác nhận lại quyền.
            </p>
          )}

          <p className="text-[11px] text-ink-muted leading-relaxed">
            Lưu ý nghiệp vụ: Sau khi được cấp vai trò mới, người dùng cần đăng xuất và đăng nhập lại để JWT cập nhật quyền mới.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={grantMutation.isPending}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmGrant}
            isLoading={grantMutation.isPending}
          >
            {grantMutation.isPending ? 'Đang cấp quyền...' : `Xác nhận cấp vai trò ${selectedRole}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
