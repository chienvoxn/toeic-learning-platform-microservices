import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { QuizCardSkeleton } from '@/components/feedback/SkeletonLoader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { formatPartName, formatTime } from '@/lib/utils';
import { BookOpen, Clock, Sparkles } from 'lucide-react';

export function DesignSystemPreview() {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      {/* Title & Philosophy */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="default" className="bg-primary">Phase F1 Deliverable</Badge>
          <Badge variant="outline">Verified Design Tokens</Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hệ Thống Thiết Kế (Design System Foundation)</h1>
        <p className="text-slate-500 mt-2 text-base">
          Bộ nguyên tử thiết kế Modern EdTech SaaS được chuẩn hóa theo bảng màu `#2563EB`, typography Plus Jakarta Sans, và các tiêu chuẩn bảo mật.
        </p>
      </div>

      {/* 1. Color Palette Tokens */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> 1. Bảng Màu & Design Tokens
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#2563EB] shadow-xs flex items-end p-2 text-white font-mono text-xs">#2563EB</div>
            <p className="text-xs font-semibold text-slate-800">Primary</p>
            <p className="text-[11px] text-slate-400">Action, Active</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#1D4ED8] shadow-xs flex items-end p-2 text-white font-mono text-xs">#1D4ED8</div>
            <p className="text-xs font-semibold text-slate-800">Deep Blue</p>
            <p className="text-[11px] text-slate-400">Hover, Headers</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-end p-2 text-blue-900 font-mono text-xs">#EFF6FF</div>
            <p className="text-xs font-semibold text-slate-800">Light Blue</p>
            <p className="text-[11px] text-slate-400">Card highlight</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-end p-2 text-slate-700 font-mono text-xs">#F8FAFC</div>
            <p className="text-xs font-semibold text-slate-800">Background</p>
            <p className="text-[11px] text-slate-400">Canvas nền</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#FFFFFF] border border-slate-300 flex items-end p-2 text-slate-700 font-mono text-xs">#FFFFFF</div>
            <p className="text-xs font-semibold text-slate-800">Surface</p>
            <p className="text-[11px] text-slate-400">Card, Modal</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#0F172A] shadow-xs flex items-end p-2 text-white font-mono text-xs">#0F172A</div>
            <p className="text-xs font-semibold text-slate-800">Text Primary</p>
            <p className="text-[11px] text-slate-400">Tiêu đề, nội dung</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-[#64748B] shadow-xs flex items-end p-2 text-white font-mono text-xs">#64748B</div>
            <p className="text-xs font-semibold text-slate-800">Muted Text</p>
            <p className="text-[11px] text-slate-400">Chú thích, nhãn</p>
          </div>
        </div>
      </section>

      {/* 2. Button Hierarchy */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">2. Nút Hành Động (Button Primitives)</h2>
        <div className="flex flex-wrap items-center gap-4 p-6 bg-white rounded-xl border border-slate-200">
          <Button variant="primary">Nút Chính (Primary)</Button>
          <Button variant="secondary">Nút Phụ (Secondary)</Button>
          <Button variant="outline">Đường Viền (Outline)</Button>
          <Button variant="accent">Nổi Bật (Accent)</Button>
          <Button variant="destructive">Nguy Hiểm (Destructive)</Button>
          <Button variant="ghost">Bóng mờ (Ghost)</Button>
          <Button variant="primary" isLoading>Đang lưu...</Button>
          <Button variant="primary" disabled>Bị vô hiệu hóa</Button>
        </div>
      </section>

      {/* 3. Badges & Part Formats */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">3. Huy Hiệu & Phân Loại Part TOEIC</h2>
        <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status="ACTIVE" />
            <StatusBadge status="PUBLISHED" />
            <StatusBadge status="DRAFT" />
            <StatusBadge status="IN_PROGRESS" />
            <StatusBadge status="GRADED" />
            <StatusBadge status="PRO" />
            <StatusBadge status="FREE" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((part) => (
              <div key={part} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <span className="text-sm font-medium text-slate-800">{formatPartName(part)}</span>
                <Badge variant={part <= 4 ? 'outline' : 'secondary'}>
                  {part <= 4 ? 'Listening' : 'Reading'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Form Controls */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">4. Ô Nhập Liệu & Validation</h2>
        <div className="p-6 bg-white rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email thí sinh</label>
            <Input placeholder="example@toeic.edu.vn" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Mật khẩu có lỗi validation</label>
            <Input
              type="password"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value.length > 0 && e.target.value.length < 8) {
                  setInputError('Mật khẩu tối thiểu phải từ 8 ký tự.');
                } else {
                  setInputError('');
                }
              }}
              error={inputError || undefined}
              placeholder="Nhập thử ít hơn 8 ký tự..."
            />
          </div>
        </div>
      </section>

      {/* 5. Feedback Alerts */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">5. Thông Báo Trực Quan (Feedback Alerts)</h2>
        <div className="space-y-3">
          <Alert type="info" title="Thông tin lượt thi">
            Thời gian đếm ngược còn {formatTime(7200)}. Hãy kiểm tra toàn bộ đáp án trước khi nộp bài.
          </Alert>
          <Alert type="success" title="Đã lưu tự động">
            Đáp án câu hỏi đã được đồng bộ an toàn với máy chủ.
          </Alert>
          <Alert type="warning" title="Hạn ngạch thực hành">
            Tài khoản FREE giới hạn 10 lượt luyện thi mỗi ngày. Bạn đã sử dụng 8/10 lượt.
          </Alert>
          <Alert type="error" title="Xung đột phiên bản (409 Conflict)">
            Bản nháp đề thi đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại dữ liệu.
          </Alert>
        </div>
      </section>

      {/* 6. Card & Skeletons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">6. Thẻ Nội Dung & Skeleton Loaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge variant="default">Part 5</Badge>
                <Badge variant="pro">PRO</Badge>
              </div>
              <CardTitle className="pt-2">ETS 2026 Reading Test 01</CardTitle>
              <CardDescription>Đề thi thử ngữ pháp và từ vựng chuyên sâu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> 30 câu hỏi trắc nghiệm
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Thời lượng: 20 phút
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="primary" className="w-full">Bắt đầu làm bài</Button>
            </CardFooter>
          </Card>

          <QuizCardSkeleton />

          <EmptyState
            title="Chưa có lượt thi nào"
            description="Bạn chưa thực hiện bài thi nào gần đây. Hãy chọn một đề thi để bắt đầu!"
            actionText="Xem danh mục đề"
            onAction={() => alert('Chuyển hướng đến /quizzes')}
          />
        </div>
      </section>
    </div>
  );
}
