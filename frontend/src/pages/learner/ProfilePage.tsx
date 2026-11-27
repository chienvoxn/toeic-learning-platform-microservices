import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/api-client';
import { UserView } from '@/types/auth';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Badge } from '@/components/atoms/Badge';
import { Avatar, AvatarFallback, UserInitials } from '@/components/atoms/Avatar';
import { Alert } from '@/components/molecules/Alert';
import { User, Lock, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có từ 2 ký tự trở lên')
    .max(120, 'Tên hiển thị tối đa 120 ký tự'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
      .max(72, 'Mật khẩu mới tối đa 72 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  LEARNER: 'Học viên',
  TEACHER: 'Giảng viên',
  ADMIN: 'Quản trị viên',
};

const PERMISSION_LABELS: Record<string, string> = {
  'content:read': 'Truy cập kho đề thi',
  'content:write': 'Biên soạn & quản lý đề thi',
  'assessment:submit': 'Làm bài & nộp bài thi',
  'assessment:read': 'Xem lịch sử bài thi cá nhân',
  'interaction:write': 'Gửi đánh giá đề thi',
  'interaction:read': 'Xem đánh giá và hoạt động học tập',
  'membership:read': 'Xem thông tin gói hội viên',
  'membership:write': 'Thay đổi gói hội viên thử nghiệm',
  'identity:read': 'Xem thông tin hồ sơ cá nhân',
  'rbac:manage': 'Quản trị người dùng & phân quyền',
};

function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role.toUpperCase()] || role;
}

function formatPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] || 'Quyền truy cập tính năng hệ thống';
}

export function ProfilePage() {
  const { user, roles, permissions, refreshRbac } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const infoTabRef = useRef<HTMLButtonElement>(null);
  const passwordTabRef = useRef<HTMLButtonElement>(null);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = activeTab === 'info' ? 'password' : 'info';
      setActiveTab(nextTab);
      if (nextTab === 'info') {
        infoTabRef.current?.focus();
      } else {
        passwordTabRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab('info');
      infoTabRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab('password');
      passwordTabRef.current?.focus();
    }
  };
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onUpdateProfile = async (data: ProfileFormData) => {
    setProfileSuccess(null);
    setProfileError(null);
    setIsProfileSaving(true);

    try {
      await apiRequest<UserView>('/ms/v1/identity/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      await refreshRbac();
      setProfileSuccess('Cập nhật tên hiển thị thành công.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cập nhật thông tin thất bại.';
      setProfileError(message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordFormData) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    setIsPasswordSaving(true);

    try {
      await apiRequest<void>('/ms/v1/identity/me/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      setPasswordSuccess('Đổi mật khẩu thành công. Hãy sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.');
      resetPasswordForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.';
      setPasswordError(message);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const displayRoles = roles.length > 0 ? roles : user?.role ? [user.role] : [];
  const humanPermissions = Array.from(new Set(permissions.map(formatPermissionLabel)));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Editorial Header & Identity Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-border pb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 shadow-brutal-sm">
            <AvatarFallback className="text-base bg-primary text-foreground">
              <UserInitials name={user?.displayName} email={user?.email} />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Tài khoản cá nhân
            </h2>
            <p className="text-sm text-ink-muted">
              Quản lý tên hiển thị, kiểm tra vai trò tài khoản và cập nhật mật khẩu bảo mật.
            </p>
          </div>
        </div>
      </div>

      {/* Brutalist Tab Switcher */}
      <div
        className="inline-flex flex-wrap rounded-md border-[1.5px] border-border bg-muted p-1 gap-1"
        role="tablist"
        aria-label="Cài đặt tài khoản cá nhân"
      >
        <button
          ref={infoTabRef}
          id="profile-tab-info"
          type="button"
          role="tab"
          aria-selected={activeTab === 'info'}
          aria-controls="profile-panel-info"
          tabIndex={activeTab === 'info' ? 0 : -1}
          onClick={() => setActiveTab('info')}
          onKeyDown={handleTabKeyDown}
          className={cn(
            'px-4 py-2 text-xs sm:text-sm font-bold rounded-sm transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeTab === 'info'
              ? 'bg-primary text-foreground border border-border shadow-subtle'
              : 'text-ink-muted hover:text-foreground border border-transparent'
          )}
        >
          <User className="h-4 w-4" /> Thông tin cá nhân
        </button>
        <button
          ref={passwordTabRef}
          id="profile-tab-password"
          type="button"
          role="tab"
          aria-selected={activeTab === 'password'}
          aria-controls="profile-panel-password"
          tabIndex={activeTab === 'password' ? 0 : -1}
          onClick={() => setActiveTab('password')}
          onKeyDown={handleTabKeyDown}
          className={cn(
            'px-4 py-2 text-xs sm:text-sm font-bold rounded-sm transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeTab === 'password'
              ? 'bg-primary text-foreground border border-border shadow-subtle'
              : 'text-ink-muted hover:text-foreground border border-transparent'
          )}
        >
          <Lock className="h-4 w-4" /> Đổi mật khẩu
        </button>
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'info' && (
        <div
          id="profile-panel-info"
          role="tabpanel"
          aria-labelledby="profile-tab-info"
          className="space-y-6"
        >
          {profileSuccess && (
            <Alert type="success" title="Cập nhật thành công">
              {profileSuccess}
            </Alert>
          )}

          {profileError && (
            <Alert type="error" title="Không thể cập nhật thông tin">
              {profileError}
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Readonly Account Summary */}
            <Card variant="default" className="md:col-span-5">
              <CardHeader className="pb-4 border-b border-border/20">
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Hồ sơ tài khoản
                </CardTitle>
                <CardDescription className="text-xs">
                  Thông tin định danh và phạm vi quyền hạn hiện tại
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4 text-sm">
                <div>
                  <span className="text-xs font-bold text-ink-muted block mb-1">Địa chỉ email</span>
                  <p className="font-mono text-xs sm:text-sm font-bold text-foreground break-all bg-background px-3 py-2 rounded-sm border border-border">
                    {user?.email || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-ink-muted block mb-1.5">Vai trò hiện tại</span>
                  <div className="flex flex-wrap gap-1.5">
                    {displayRoles.length > 0 ? (
                      displayRoles.map((role) => (
                        <Badge key={role} variant="default">
                          {formatRoleLabel(role)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Học viên</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-ink-muted block mb-1.5">Quyền sử dụng</span>
                  {humanPermissions.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-foreground">
                      {humanPermissions.map((label) => (
                        <li
                          key={label}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-background border border-border/40"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-ink-muted">Quyền học viên tiêu chuẩn</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Editable Profile Form */}
            <Card variant="default" className="md:col-span-7">
              <CardHeader className="pb-4 border-b border-border/20">
                <CardTitle className="text-base font-extrabold text-foreground">Chỉnh sửa tên hiển thị</CardTitle>
                <CardDescription className="text-xs">
                  Tên hiển thị được sử dụng trong lời chào trang tổng quan và nhận xét đề thi.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleProfileSubmit(onUpdateProfile)}>
                <CardContent className="pt-5 space-y-4">
                  <Input
                    label="Tên hiển thị"
                    placeholder="Nhập tên hiển thị mới..."
                    error={profileErrors.displayName?.message}
                    {...registerProfile('displayName')}
                  />
                  <p className="text-xs text-ink-muted">
                    Độ dài hợp lệ từ 2 đến 120 ký tự.
                  </p>
                </CardContent>

                <CardFooter className="pt-2 flex justify-end border-t border-border/20">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="gap-2 mt-4"
                    isLoading={isProfileSaving}
                  >
                    <Save className="h-4 w-4" /> Lưu thay đổi
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Change Password */}
      {activeTab === 'password' && (
        <div id="profile-panel-password" role="tabpanel" aria-labelledby="profile-tab-password">
        <Card variant="default" className="max-w-xl">
          <CardHeader className="pb-4 border-b border-border/20">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Đổi mật khẩu đăng nhập
            </CardTitle>
            <CardDescription className="text-xs">
              Mật khẩu mới phải có tối thiểu 8 ký tự và khác với mật khẩu đang sử dụng.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handlePasswordSubmit(onChangePassword)}>
            <CardContent className="pt-5 space-y-4">
              {passwordSuccess && (
                <Alert type="success" title="Đổi mật khẩu thành công">
                  {passwordSuccess}
                </Alert>
              )}

              {passwordError && (
                <Alert type="error" title="Không thể đổi mật khẩu">
                  {passwordError}
                </Alert>
              )}

              <Input
                label="Mật khẩu hiện tại"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword')}
              />

              <Input
                label="Mật khẩu mới (tối thiểu 8 ký tự)"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.newPassword?.message}
                {...registerPassword('newPassword')}
              />

              <Input
                label="Xác nhận mật khẩu mới"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword')}
              />
            </CardContent>

            <CardFooter className="pt-2 flex justify-end border-t border-border/20">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="gap-2 mt-4"
                isLoading={isPasswordSaving}
              >
                <Lock className="h-4 w-4" /> Cập nhật mật khẩu
              </Button>
            </CardFooter>
          </form>
        </Card>
        </div>
      )}
    </div>
  );
}
