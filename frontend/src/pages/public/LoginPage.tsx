import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/api-client';
import { Session } from '@/types/auth';
import { useAuth } from '@/features/auth/AuthContext';
import { sanitizeRedirectUrl } from '@/components/navigation/ProtectedRoute';
import { ApiError } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/feedback/Alert';
import { GraduationCap, LogIn, Sparkles } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Địa chỉ email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await apiRequest<Session>('/ms/v1/identity/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      await login(session);

      const targetUrl = sanitizeRedirectUrl(searchParams.get('redirect'));
      navigate(targetUrl, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setErrorMessage('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message || 'Không thể kết nối đến máy chủ xác thực.');
      } else {
        setErrorMessage('Không thể kết nối đến máy chủ xác thực.');
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
            <CardTitle className="text-2xl font-extrabold text-slate-900">Đăng Nhập</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Nhập thông tin tài khoản của bạn để tiếp tục học tập
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert type="error" title="Đăng nhập không thành công">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
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
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>
            </form>

            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 text-xs text-blue-900 space-y-1">
              <div className="font-semibold flex items-center gap-1 text-primary">
                <Sparkles className="h-3 w-3" /> Tài khoản mẫu (Demo Accounts):
              </div>
              <p className="text-[11px] text-slate-600">
                • Learner: <code className="bg-white px-1 py-0.5 rounded text-slate-800">learner@toeic.com</code> / <code className="bg-white px-1 py-0.5 rounded text-slate-800">pass1234</code>
              </p>
              <p className="text-[11px] text-slate-600">
                • Teacher: <code className="bg-white px-1 py-0.5 rounded text-slate-800">teacher@toeic.com</code> / <code className="bg-white px-1 py-0.5 rounded text-slate-800">pass1234</code>
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              form="login-form"
              variant="primary"
              className="w-full h-11 text-sm font-bold gap-2"
              isLoading={isLoading}
            >
              <LogIn className="h-4 w-4" /> Đăng nhập
            </Button>

            <p className="text-xs text-center text-slate-500">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Tạo tài khoản miễn phí
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
