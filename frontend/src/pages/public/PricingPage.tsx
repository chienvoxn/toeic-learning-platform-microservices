import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/atoms/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/atoms/Table';
import { Alert } from '@/components/molecules/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Check, Minus } from 'lucide-react';

export function PricingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Editorial Title */}
      <div className="space-y-4 border-b-2 border-border pb-8">
        <Badge variant="outline" className="uppercase tracking-wider">
          Bảng giá &amp; hạn ngạch
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Lựa chọn gói học phù hợp
        </h1>
        <p className="text-sm sm:text-base text-ink-muted max-w-2xl leading-relaxed">
          Hạn ngạch luyện tập hằng ngày và quyền mở khóa các bộ đề chuyên sâu được quản lý tự động theo hạng gói tài khoản của bạn.
        </p>
      </div>

      {/* Honest Demo Notification Banner */}
      <Alert type="warning" title="Môi trường thử nghiệm &amp; chính sách gói tài khoản (Demo)">
        <p className="text-sm leading-relaxed">
          Hệ thống hiện tại là nền tảng học tập thử nghiệm, <strong>chưa tích hợp cổng thanh toán và không thu bất kỳ khoản phí thực tế nào</strong>. Mức giá hiển thị mang tính chất mô phỏng. Khi tính năng đổi gói thử nghiệm được bật, học viên có thể tự do nâng cấp lên gói PRO trong trang Quản lý gói hội viên để trải nghiệm đầy đủ hạn ngạch 1.000 lượt/ngày và mở khóa kho đề thi chuyên sâu.
        </p>
      </Alert>

      {/* Editorial Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* FREE PLAN */}
        <Card variant="default" className="p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-background border-b-[1.5px] border-border px-6 py-3 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
                Gói Cơ Bản
              </span>
              <Badge variant="outline" className="font-mono">
                FREE
              </Badge>
            </div>

            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-extrabold text-foreground">Gói FREE</CardTitle>
              <div className="font-mono tabular-nums text-3xl font-extrabold text-foreground pt-2">
                0 VNĐ <span className="font-sans text-xs font-medium text-ink-muted">/ mặc định</span>
              </div>
              <CardDescription className="pt-1">
                Phù hợp cho học viên làm quen với cấu trúc 7 phần thi và luyện tập hằng ngày.
              </CardDescription>
            </CardHeader>

            <div className="px-6 pb-6 space-y-3 text-sm text-foreground">
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Tối đa <strong className="font-mono">10 lượt/ngày</strong> tạo bài luyện tập mới
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Truy cập toàn bộ đề thi gắn nhãn FREE</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Tự động lưu đáp án, chấm điểm và lưu lịch sử thi</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Xem giải thích chi tiết từng câu sau khi bài thi được chấm</span>
              </div>
            </div>
          </div>

          <CardFooter className="pt-0">
            <Link to={isAuthenticated ? '/quizzes' : '/register'} className="w-full">
              <Button variant="outline" className="w-full">
                {isAuthenticated ? 'Vào luyện đề ngay' : 'Đăng ký miễn phí'}
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* PRO PLAN */}
        <Card variant="elevated" className="p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-primary border-b-2 border-border px-6 py-3 flex items-center justify-between">
              <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-foreground">
                Hạn Ngạch Mở Rộng
              </span>
              <Badge variant="outline" className="font-mono bg-surface">
                1.000 LƯỢT / NGÀY
              </Badge>
            </div>

            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-extrabold text-foreground">Gói PRO</CardTitle>
              <div className="font-mono tabular-nums text-3xl font-extrabold text-foreground pt-2">
                199.000 VNĐ <span className="font-sans text-xs font-medium text-ink-muted">/ tháng (Giá mô phỏng)</span>
              </div>
              <CardDescription className="pt-1">
                Dành cho học viên cần mở khóa toàn bộ đề thi nâng cao và tăng hạn ngạch lên 1.000 lượt luyện tập mỗi ngày (kích hoạt thử nghiệm miễn phí).
              </CardDescription>
            </CardHeader>

            <div className="px-6 pb-6 space-y-3 text-sm text-foreground">
              <div className="flex items-start gap-2.5 font-semibold">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Tối đa <strong className="font-mono">1.000 lượt/ngày</strong> tạo bài luyện tập mới
                </span>
              </div>
              <div className="flex items-start gap-2.5 font-semibold">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Mở khóa toàn bộ đề thi gắn nhãn PRO và FREE</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Tự động lưu đáp án, chấm điểm và lưu lịch sử thi</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Xem giải thích chi tiết từng câu sau khi bài thi được chấm</span>
              </div>
            </div>
          </div>

          <CardFooter className="pt-0">
            <Link to={isAuthenticated ? '/learner/membership' : '/login?redirect=/pricing'} className="w-full">
              <Button variant="primary" className="w-full gap-1.5">
                <span>{isAuthenticated ? 'Quản lý gói trải nghiệm' : 'Đăng nhập để trải nghiệm'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Accurate Feature Comparison Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-foreground">
          Bảng đối chiếu quyền lợi tài khoản
        </h2>
        <Card variant="flat" className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted">
                <TableHead>Quyền lợi trong hệ thống</TableHead>
                <TableHead className="text-center w-36">Gói FREE</TableHead>
                <TableHead className="text-center w-40 bg-primary/40">Gói PRO (Mô phỏng)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Giới hạn lượt thi mới mỗi ngày (UTC)</TableCell>
                <TableCell className="text-center font-mono tabular-nums font-bold">10 lượt</TableCell>
                <TableCell className="text-center font-mono tabular-nums font-extrabold bg-primary/15">1.000 lượt</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Truy cập đề thi tiêu chuẩn (FREE)</TableCell>
                <TableCell className="text-center font-bold">Có</TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Có</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Truy cập đề thi chuyên sâu (PRO)</TableCell>
                <TableCell className="text-center text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Minus className="h-3.5 w-3.5" /> Không
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Có</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Lưu đáp án từng câu &amp; chấm điểm tự động</TableCell>
                <TableCell className="text-center font-bold">Có</TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Có</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Xem giải thích chi tiết &amp; viết đánh giá</TableCell>
                <TableCell className="text-center font-bold">Có</TableCell>
                <TableCell className="text-center font-bold bg-primary/15">Có</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
