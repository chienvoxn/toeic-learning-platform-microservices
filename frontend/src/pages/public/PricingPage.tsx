import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthContext';
import { ShieldCheck, ArrowRight, Sparkles, Check, Info } from 'lucide-react';

export function PricingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
      {/* Title */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <Badge variant="outline" className="text-primary border-primary/20">Bảng Giá Minh Bạch</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Lựa Chọn Gói Học Phù Hợp
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Tất cả các gói đều bám sát cấu trúc đề thi TOEIC chuẩn quốc tế. Tự động chấm điểm và hỗ trợ học tập liên tục.
        </p>

        {/* Honest Demo Notification Banner */}
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 text-left">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Thông báo minh bạch về môi trường thử nghiệm (Demo Environment):</p>
            <p className="leading-relaxed opacity-90">
              Hệ thống hiện tại chưa tích hợp cổng thanh toán thực tế (VNPAY/Momo/Stripe). Việc chuyển đổi gói FREE sang PRO là tính năng thử nghiệm nội bộ dành cho mục đích đánh giá và chấm điểm đồ án.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* FREE PLAN */}
        <Card className="border-slate-200 shadow-card bg-white flex flex-col justify-between">
          <div>
            <CardHeader className="pb-4">
              <Badge variant="secondary" className="w-fit mb-2">Gói Cơ Bản</Badge>
              <CardTitle className="text-2xl font-bold text-slate-900">Gói FREE</CardTitle>
              <div className="text-3xl font-black text-slate-900 mt-2">
                0 VNĐ <span className="text-xs font-normal text-slate-500">/ miễn phí vĩnh viễn</span>
              </div>
              <CardDescription className="mt-2 text-xs text-slate-500">
                Phù hợp cho học viên mới bắt đầu làm quen với format đề và luyện tập cơ bản.
              </CardDescription>
            </CardHeader>

            <div className="p-6 pt-0 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Tối đa <strong>10 lượt luyện đề</strong> mỗi ngày (Daily Quota)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Truy cập toàn bộ đề thi chuẩn FREE</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Tự động chấm điểm và lưu lịch sử thi</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Gửi nhận xét và đánh giá sao cho đề thi</span>
              </div>
            </div>
          </div>

          <CardFooter className="pt-2">
            <Link to={isAuthenticated ? '/quizzes' : '/register'} className="w-full">
              <Button variant="outline" className="w-full font-semibold">
                {isAuthenticated ? 'Vào luyện đề ngay' : 'Bắt đầu miễn phí'}
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* PRO PLAN */}
        <Card className="border-primary/50 shadow-elevation bg-white relative flex flex-col justify-between">
          <div className="absolute -top-3 right-6">
            <Badge variant="pro" className="flex items-center gap-1 shadow-xs">
              <Sparkles className="h-3 w-3" /> KHUYÊN DÙNG
            </Badge>
          </div>

          <div>
            <CardHeader className="pb-4">
              <Badge variant="pro" className="w-fit mb-2">Không Giới Hạn</Badge>
              <CardTitle className="text-2xl font-bold text-primary">Gói PRO</CardTitle>
              <div className="text-3xl font-black text-slate-900 mt-2">
                199.000 VNĐ <span className="text-xs font-normal text-slate-500">/ tháng (Demo)</span>
              </div>
              <CardDescription className="mt-2 text-xs text-slate-500">
                Dành cho người học mục tiêu cao, cần luyện tập liên tục và mở khóa toàn bộ đề Premium.
              </CardDescription>
            </CardHeader>

            <div className="p-6 pt-0 space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center gap-2.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Lên đến <strong>1.000 lượt luyện đề</strong> mỗi ngày</span>
              </div>
              <div className="flex items-center gap-2.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Mở khóa 100% các đề thi có gắn mác <strong>PRO</strong></span>
              </div>
              <div className="flex items-center gap-2.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Xem giải thích ngữ pháp chi tiết sau khi chấm điểm</span>
              </div>
              <div className="flex items-center gap-2.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Ưu tiên băng thông trong các phòng thi trực tuyến</span>
              </div>
            </div>
          </div>

          <CardFooter className="pt-2">
            <Link to={isAuthenticated ? '/learner/membership' : '/login?redirect=/pricing'} className="w-full">
              <Button variant="primary" className="w-full font-bold gap-1.5 shadow-md">
                <span>{isAuthenticated ? 'Kích hoạt thử nghiệm PRO' : 'Đăng nhập để kích hoạt'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Feature comparison table */}
      <div className="max-w-4xl mx-auto pt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">Bảng So Sánh Quyền Lợi Chi Tiết</h3>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3.5">Tính năng</th>
                <th className="p-3.5 text-center w-32">Gói FREE</th>
                <th className="p-3.5 text-center w-32 text-primary font-bold">Gói PRO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="p-3.5 font-medium text-slate-800">Giới hạn luyện thi / ngày</td>
                <td className="p-3.5 text-center font-bold">10 lượt</td>
                <td className="p-3.5 text-center font-bold text-primary">1.000 lượt</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-slate-800">Truy cập đề thi cơ bản</td>
                <td className="p-3.5 text-center text-emerald-600">Có</td>
                <td className="p-3.5 text-center text-emerald-600">Có</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-slate-800">Truy cập đề thi Premium</td>
                <td className="p-3.5 text-center text-slate-400">Không</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold">Có</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-slate-800">Tự động chấm điểm & Lưu lịch sử</td>
                <td className="p-3.5 text-center text-emerald-600">Có</td>
                <td className="p-3.5 text-center text-emerald-600">Có</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-slate-800">Hỗ trợ học viên</td>
                <td className="p-3.5 text-center">Tiêu chuẩn</td>
                <td className="p-3.5 text-center font-bold text-primary">Ưu tiên</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
