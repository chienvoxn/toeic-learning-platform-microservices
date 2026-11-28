import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/api-client';
import { Session } from '@/types/auth';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/types/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Alert } from '@/components/molecules/Alert';
import { Check, UserPlus } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 lg:py-16">
      <div className="border-2 border-border rounded-lg shadow-brutal-lg overflow-hidden bg-surface grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand & Editorial Context Panel */}
        <div className="lg:col-span-5 bg-muted border-b-2 lg:border-b-0 lg:border-r-2 border-border p-5 sm:p-8 lg:p-9 flex flex-col justify-between gap-6 sm:gap-8">
          <div className="space-y-4 sm:space-y-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-sm border-[1.5px] border-border bg-primary text-foreground flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 5.5H20V9H13.75V19H10.25V9H4V5.5Z" fill="currentColor" />
                  <rect x="16.5" y="13" width="3.5" height="6" fill="currentColor" />
                </svg>
              </div>
              <span className="font-extrabold text-lg text-foreground tracking-tight">TOEIC Master</span>
            </Link>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
                Tạo tài khoản mới
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                Khởi tạo hồ sơ luyện thi TOEIC
              </h1>
              <p className="text-sm text-ink-muted leading-relaxed">
                Tài khoản mới được cấp quyền Học viên mặc định với 10 lượt luyện đề miễn phí mỗi ngày.
              </p>
            </div>

            <ul className="space-y-2.5 pt-2 text-sm text-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Không yêu cầu thẻ thanh toán khi đăng ký</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Truy cập toàn bộ bộ đề miễn phí Part 1 – Part 7</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Lưu trữ lịch sử bài thi và đánh dấu câu hỏi</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-md border border-border bg-surface text-xs text-ink-muted leading-relaxed">
            Bằng việc đăng ký, hệ thống sẽ khởi tạo phiên đăng nhập an toàn và điều hướng bạn vào không gian học tập.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 bg-surface flex flex-col justify-center">
          <div className="space-y-6 max-w-md w-full mx-auto">
            <div className="space-y-1.5 border-b border-border/20 pb-4">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Tạo tài khoản</h2>
              <p className="text-sm text-ink-muted">
                Điền thông tin cá nhân bên dưới để bắt đầu.
              </p>
            </div>

            {errorMessage && (
              <Alert type="error" title="Đăng ký không thành công">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="register-form">
              <Input
                label="Tên hiển thị"
                placeholder="Nguyễn Văn A"
                error={errors.displayName?.message}
                {...register('displayName')}
              />

              <Input
                label="Địa chỉ email"
                type="email"
                placeholder="learner@toeic.edu.vn"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Mật khẩu (tối thiểu 8 ký tự)"
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
                <UserPlus className="h-4 w-4" /> Bắt đầu luyện thi
              </Button>
            </form>

            <p className="text-sm text-center text-ink-muted pt-2">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="font-extrabold text-foreground underline decoration-2 underline-offset-4 hover:bg-primary px-1 rounded-sm"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
