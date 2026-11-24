import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Headphones,
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';

export function LandingPage() {
  const [activeSkillTab, setActiveSkillTab] = useState<'all' | 'listening' | 'reading'>('all');

  const toeicParts = [
    { part: 1, skill: 'listening', name: 'Mô tả hình ảnh (Photographs)', questions: '6 câu', desc: 'Nghe 4 câu miêu tả về một bức ảnh và chọn câu miêu tả đúng nhất.' },
    { part: 2, skill: 'listening', name: 'Hỏi & Đáp (Question-Response)', questions: '25 câu', desc: 'Nghe một câu hỏi hoặc phát biểu và chọn 1 trong 3 câu hồi đáp phù hợp nhất.' },
    { part: 3, skill: 'listening', name: 'Đoạn hội thoại (Conversations)', questions: '39 câu', desc: 'Nghe đoạn đối thoại giữa 2-3 người và trả lời 3 câu hỏi cho mỗi đoạn.' },
    { part: 4, skill: 'listening', name: 'Bài nói ngắn (Short Talks)', questions: '30 câu', desc: 'Nghe một bài phát biểu ngắn (thông báo, hướng dẫn...) và trả lời 3 câu hỏi.' },
    { part: 5, skill: 'reading', name: 'Hoàn thành câu (Incomplete Sentences)', questions: '30 câu', desc: 'Chọn 1 trong 4 từ/cụm từ thích hợp nhất để hoàn chỉnh câu cho sẵn.' },
    { part: 6, skill: 'reading', name: 'Hoàn thành đoạn văn (Text Completion)', questions: '16 câu', desc: 'Điền từ, cụm từ hoặc cả câu vào chỗ trống trong các văn bản thương mại.' },
    { part: 7, skill: 'reading', name: 'Đọc hiểu đoạn văn (Reading Comprehension)', questions: '54 câu', desc: 'Đọc các đoạn đơn, đoạn đôi, đoạn ba và trả lời câu hỏi đọc hiểu thông tin.' },
  ];

  const filteredParts = toeicParts.filter(
    (p) => activeSkillTab === 'all' || p.skill === activeSkillTab
  );

  return (
    <div className="space-y-24 py-10 md:py-16">
      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-primary text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng Luyện Thi TOEIC Chuẩn Format Quốc Tế</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Nâng Băng Điểm TOEIC Với <br />
            <span className="text-primary bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Trải Nghiệm Thi Trực Tuyến Đích Thực
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Hệ thống luyện đề thông minh bám sát cấu trúc đề thi TOEIC. Tự động chấm điểm, phân tích chi tiết đáp án và quản lý lộ trình học tập hiệu quả.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/quizzes" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-md">
                Luyện đề ngay bây giờ <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                Tìm hiểu gói Hội viên
              </Button>
            </Link>
          </div>

          {/* Quick Platform Metrics */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <p className="text-2xl font-black text-slate-900">7 Parts</p>
              <p className="text-xs text-slate-500 font-medium">Listening & Reading</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <p className="text-2xl font-black text-primary">100%</p>
              <p className="text-xs text-slate-500 font-medium">Chấm điểm tự động</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <p className="text-2xl font-black text-slate-900">Luyện tập</p>
              <p className="text-xs text-slate-500 font-medium">Theo từng Part & Bộ đề</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <p className="text-2xl font-black text-emerald-600">FREE</p>
              <p className="text-xs text-slate-500 font-medium">Bắt đầu không tốn phí</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Format 7 Phần Thi TOEIC Quốc Tế */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <Badge variant="outline" className="text-primary border-primary/20">Cấu Trúc Đề Thi</Badge>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">7 Phần Thi TOEIC Quốc Tế Đầy Đủ</h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Học viên có thể chọn luyện tập từng Part riêng lẻ hoặc thực hiện bài thi tổng hợp.
          </p>

          {/* Tabs Filter */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 mt-4">
            <button
              onClick={() => setActiveSkillTab('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSkillTab === 'all' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả 7 phần
            </button>
            <button
              onClick={() => setActiveSkillTab('listening')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeSkillTab === 'listening' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Headphones className="h-3.5 w-3.5" /> Listening (Part 1 - 4)
            </button>
            <button
              onClick={() => setActiveSkillTab('reading')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeSkillTab === 'reading' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Reading (Part 5 - 7)
            </button>
          </div>
        </div>

        {/* Parts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParts.map((item) => (
            <Card key={item.part} className="border-slate-200 hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={item.skill === 'listening' ? 'outline' : 'secondary'}>
                    {item.skill === 'listening' ? 'Listening' : 'Reading'}
                  </Badge>
                  <span className="text-xs font-bold text-slate-500">{item.questions}</span>
                </div>
                <CardTitle className="text-base font-bold text-slate-900 pt-2">
                  Part {item.part}: {item.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.desc}</p>
                <Link to={`/quizzes?part=${item.part}`}>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-semibold text-primary hover:bg-blue-50 px-2">
                    <span>Tìm đề Part {item.part}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. Core Pillars / Architecture Highlights */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="outline" className="text-indigo-600 border-indigo-200">Đặc Quyền Nổi Bật</Badge>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Vì Sao Nên Luyện Thi Tại TOEIC Master?</h2>
            <p className="text-sm text-slate-500 max-w-xl mx-auto">
              Thiết kế hướng tới hiệu quả thực chất, giao diện tập trung và công nghệ chấm điểm chính xác.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 text-primary flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Phòng Thi Tập Trung & Tự Động Lưu</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Giao diện thi tối giản, loại bỏ hoàn toàn các yếu tố gây xao nhãng. Từng đáp án được tự động lưu lên máy chủ giúp bạn yên tâm trong suốt buổi làm bài.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Giải Thích Chi Tiết Từng Câu Hỏi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sau khi nộp bài, hệ thống hiển thị điểm số tức thì cùng lời giải thích ngữ pháp và từ vựng rõ ràng cho từng câu đúng sai.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Đa Dạng Vai Trò Học Viên & Giáo Viên</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hệ thống hỗ trợ Giảng viên biên soạn đề thi bằng bộ công cụ soạn thảo câu hỏi chuyên dụng và nhập nhanh đề thi từ file CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Three-step Learner Journey */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="outline">Quy Trình Luyện Tập</Badge>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">3 Bước Đơn Giản Để Bắt Đầu</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl border border-slate-100 bg-white shadow-xs">
            <div className="h-10 w-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-base">
              1
            </div>
            <h4 className="font-bold text-base text-slate-900">Chọn Đề Thi Phù Hợp</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khám phá kho đề thi phong phú, lọc theo Part mong muốn hoặc chọn bài thi thử tổng hợp.
            </p>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl border border-slate-100 bg-white shadow-xs">
            <div className="h-10 w-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-base">
              2
            </div>
            <h4 className="font-bold text-base text-slate-900">Làm Bài Có Bấm Giờ</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Làm quen với áp lực thời gian của kỳ thi thật, chọn đáp án bằng bàn phím hoặc chuột.
            </p>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl border border-slate-100 bg-white shadow-xs">
            <div className="h-10 w-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-base">
              3
            </div>
            <h4 className="font-bold text-base text-slate-900">Xem Điểm & Rút Kinh Nghiệm</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nhận kết quả ngay lập tức, đọc kỹ phần giải thích ngữ pháp để không lặp lại lỗi sai.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 md:p-14 text-center space-y-6 shadow-elevation">
          <Badge variant="pro" className="bg-white/20 text-white border-white/30 backdrop-blur-xs">
            Bắt đầu hành trình chinh phục mục tiêu
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-2xl mx-auto">
            Sẵn Sàng Cho Điểm Số TOEIC Đột Phá?
          </h2>
          <p className="text-blue-100 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Đăng ký tài khoản học viên ngay hôm nay để nhận 10 lượt luyện đề miễn phí mỗi ngày.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-blue-50 font-bold px-8 shadow-sm">
                Đăng ký tài khoản miễn phí
              </Button>
            </Link>
            <Link to="/quizzes">
              <Button variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10 font-medium px-8">
                Khám phá kho đề thi
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
