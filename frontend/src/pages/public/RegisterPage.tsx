import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/api-client';
import { Session } from '@/types/auth';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/feedback/Alert';
import { GraduationCap, UserPlus, CheckCircle2 } from 'lucide-react';

const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Tên hiển thị tối thiểu 2 ký tự')
    .max(120, 'Tên hiển thị tối đa 120 ký tự'),
  email: z.string().min(1, 'Vui lòng nhập email').email('Địa chỉ email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .max(72, 'Mật khẩu tối đa 72 ký tự'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await apiRequest<Session>('/ms/v1/identity/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      await login(session);
      navigate('/learner/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMessage('Địa chỉ email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.');
      } else {
        setErrorMessage('Đăng ký tài khoản thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">TOEIC Master</span>
          </Link>
        </div>

        <Card className="shadow-card border-slate-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-extrabold text-slate-900">Tạo Tài Khoản</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Nhận ngay 10 lượt luyện đề miễn phí mỗi ngày
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert type="error" title="Đăng ký không thành công">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="register-form">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Tên hiển thị</label>
                <Input
                  placeholder="Nguyễn Văn A"
                  error={errors.displayName?.message}
                  {...register('displayName')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Địa chỉ Email</label>
                <Input
                  type="email"
                  placeholder="learner@toeic.edu.vn"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu (tối thiểu 8 ký tự)</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>
            </form>

            <div className="space-y-1.5 pt-1 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Mặc định cấp quyền Học viên (LEARNER)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Không yêu cầu thẻ thanh toán</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              form="register-form"
              variant="primary"
              className="w-full h-11 text-sm font-bold gap-2"
              isLoading={isLoading}
            >
              <UserPlus className="h-4 w-4" /> Bắt đầu luyện thi
            </Button>

            <p className="text-xs text-center text-slate-500">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
