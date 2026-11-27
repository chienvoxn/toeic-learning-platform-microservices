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
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Alert } from '@/components/molecules/Alert';
import { Check, LogIn } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="border-2 border-border rounded-lg shadow-brutal-lg overflow-hidden bg-surface grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand & Editorial Context Panel */}
        <div className="lg:col-span-5 bg-muted border-b-2 lg:border-b-0 lg:border-r-2 border-border p-7 sm:p-9 flex flex-col justify-between gap-8">
          <div className="space-y-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-sm border-[1.5px] border-border bg-primary text-foreground flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 5.5H20V9H13.75V19H10.25V9H4V5.5Z" fill="currentColor" />
                  <rect x="16.5" y="13" width="3.5" height="6" fill="currentColor" />
                </svg>
              </div>
              <span className="font-black text-lg text-foreground tracking-tight">TOEIC Master</span>
            </Link>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
                Cổng đăng nhập
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                Tiếp tục lộ trình luyện đề của bạn
              </h1>
              <p className="text-sm text-ink-muted leading-relaxed">
                Đăng nhập để mở phòng thi trực tuyến, theo dõi lịch sử làm bài và xem giải thích chi tiết sau khi chấm.
              </p>
            </div>

            <ul className="space-y-2.5 pt-2 text-sm text-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Tự động lưu đáp án theo từng câu hỏi</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Đồng bộ vai trò Học viên, Giảng viên và Quản trị viên</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Quản lý hạn ngạch luyện tập theo gói FREE / PRO</span>
              </li>
            </ul>
          </div>

          {import.meta.env.DEV && (
            <div className="p-3.5 rounded-md border border-border bg-surface text-xs space-y-1.5">
              <p className="font-mono font-bold uppercase tracking-wider text-foreground">
                Dev Mode · Tài khoản mẫu nội bộ
              </p>
              <p className="text-ink-muted">
                • Learner: <code className="font-mono text-foreground">learner@toeic.com</code>
              </p>
              <p className="text-ink-muted">
                • Teacher: <code className="font-mono text-foreground">teacher@toeic.com</code>
              </p>
              <p className="text-[11px] text-ink-muted">
                Chỉ hiển thị ở môi trường development; xem tài liệu seed nội bộ để lấy mật khẩu thử nghiệm.
              </p>
            </div>
          )}
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-7 sm:p-10 bg-surface flex flex-col justify-center">
          <div className="space-y-6 max-w-md w-full mx-auto">
            <div className="space-y-1.5 border-b border-border/20 pb-4">
              <h2 className="text-2xl font-black text-foreground tracking-tight">Đăng nhập</h2>
              <p className="text-sm text-ink-muted">
                Nhập email và mật khẩu tài khoản TOEIC Master của bạn.
              </p>
            </div>

            {errorMessage && (
              <Alert type="error" title="Đăng nhập không thành công">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
              <Input
                label="Địa chỉ email"
                type="email"
                placeholder="learner@toeic.edu.vn"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full gap-2 mt-2"
                isLoading={isLoading}
              >
                <LogIn className="h-4 w-4" /> Đăng nhập
              </Button>
            </form>

            <p className="text-sm text-center text-ink-muted pt-2">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="font-extrabold text-foreground underline decoration-2 underline-offset-4 hover:bg-primary px-1 rounded-sm"
              >
                Tạo tài khoản miễn phí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
