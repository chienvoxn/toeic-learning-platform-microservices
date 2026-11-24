import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/api-client';
import { UserView } from '@/types/auth';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/feedback/Alert';
import { 
  User, 
  Lock, 
  KeyRound, 
  Save
} from 'lucide-react';

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

export function ProfilePage() {
  const { user, permissions, refreshRbac } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
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
      setProfileSuccess('Cập nhật tên hiển thị thành công!');
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

      setPasswordSuccess('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
      resetPasswordForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.';
      setPasswordError(message);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Tài Khoản Cá Nhân
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý thông tin cá nhân, quyền hạn truy cập và bảo mật mật khẩu.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'info'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="h-4 w-4" /> Thông tin chung & Quyền
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Lock className="h-4 w-4" /> Đổi mật khẩu
        </button>
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {profileSuccess && (
            <Alert type="success" title="Thành công">
              {profileSuccess}
            </Alert>
          )}

          {profileError && (
            <Alert type="error" title="Lỗi cập nhật">
              {profileError}
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Readonly Account Details */}
            <Card className="border-slate-200 md:col-span-1 bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">Chi Tiết Hồ Sơ</CardTitle>
                <CardDescription className="text-xs">Thông tin hệ thống cấp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Mã định danh (User ID):</span>
                  <code className="bg-slate-100 p-1 rounded font-mono text-[10px] break-all block text-slate-700">
                    {user?.userId}
                  </code>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Địa chỉ Email:</span>
                  <p className="font-semibold text-slate-800 break-all">{user?.email}</p>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Vai trò hệ thống (Role):</span>
                  <Badge variant="default" className="text-xs">{user?.role}</Badge>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Quyền hạn được cấp (Permissions):</span>
                  <div className="flex flex-wrap gap-1">
                    {permissions.length > 0 ? (
                      permissions.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] bg-slate-50">
                          {p}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Không có quyền riêng</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable Profile Form */}
            <Card className="border-slate-200 md:col-span-2 bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">Chỉnh Sửa Thông Tin</CardTitle>
                <CardDescription className="text-xs">
                  Cập nhật tên hiển thị của bạn trong các bảng thành tích và bài thi
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleProfileSubmit(onUpdateProfile)}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tên hiển thị (Display Name)</label>
                    <Input
                      placeholder="Nhập tên hiển thị mới..."
                      error={profileErrors.displayName?.message}
                      {...registerProfile('displayName')}
                    />
                    <p className="text-[11px] text-slate-400">
                      Tên hiển thị tối thiểu từ 2 đến 120 ký tự.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="gap-2 font-bold"
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
        <Card className="max-w-xl border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Đổi Mật Khẩu Đăng Nhập
            </CardTitle>
            <CardDescription className="text-xs">
              Mật khẩu mới phải có tối thiểu 8 ký tự và khác với mật khẩu đang sử dụng.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handlePasswordSubmit(onChangePassword)}>
            <CardContent className="space-y-4">
              {passwordSuccess && (
                <Alert type="success" title="Thành công">
                  {passwordSuccess}
                </Alert>
              )}

              {passwordError && (
                <Alert type="error" title="Lỗi đổi mật khẩu">
                  {passwordError}
                </Alert>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu hiện tại</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={passwordErrors.currentPassword?.message}
                  {...registerPassword('currentPassword')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu mới (tối thiểu 8 ký tự)</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={passwordErrors.confirmPassword?.message}
                  {...registerPassword('confirmPassword')}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="gap-2 font-bold"
                isLoading={isPasswordSaving}
              >
                <Lock className="h-4 w-4" /> Cập nhật mật khẩu
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
