import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Card } from '@/components/atoms/Card';
import { FilterButtonGroup } from '@/components/molecules/FilterButtonGroup';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Headphones,
  Layers,
  Zap,
} from 'lucide-react';

interface ToeicPartInfo {
  part: number;
  skill: 'listening' | 'reading';
  name: string;
  questions: string;
  desc: string;
}

const TOEIC_PARTS: ToeicPartInfo[] = [
  { part: 1, skill: 'listening', name: 'Mô tả hình ảnh (Photographs)', questions: '6 câu', desc: 'Nghe 4 câu miêu tả về một bức ảnh và chọn câu miêu tả đúng nhất.' },
  { part: 2, skill: 'listening', name: 'Hỏi & Đáp (Question-Response)', questions: '25 câu', desc: 'Nghe một câu hỏi hoặc phát biểu và chọn 1 trong 3 câu hồi đáp phù hợp nhất.' },
  { part: 3, skill: 'listening', name: 'Đoạn hội thoại (Conversations)', questions: '39 câu', desc: 'Nghe đoạn đối thoại giữa 2–3 người và trả lời 3 câu hỏi cho mỗi đoạn.' },
  { part: 4, skill: 'listening', name: 'Bài nói ngắn (Short Talks)', questions: '30 câu', desc: 'Nghe một bài phát biểu ngắn (thông báo, hướng dẫn) và trả lời 3 câu hỏi.' },
  { part: 5, skill: 'reading', name: 'Hoàn thành câu (Incomplete Sentences)', questions: '30 câu', desc: 'Chọn 1 trong 4 từ hoặc cụm từ thích hợp để hoàn chỉnh câu cho sẵn.' },
  { part: 6, skill: 'reading', name: 'Hoàn thành đoạn văn (Text Completion)', questions: '16 câu', desc: 'Điền từ, cụm từ hoặc câu vào chỗ trống trong văn bản thương mại.' },
  { part: 7, skill: 'reading', name: 'Đọc hiểu đoạn văn (Reading Comprehension)', questions: '54 câu', desc: 'Đọc các đoạn đơn, đoạn đôi, đoạn ba và trả lời câu hỏi đọc hiểu thông tin.' },
];

export function LandingPage() {
  const [activeSkillTab, setActiveSkillTab] = useState<'all' | 'listening' | 'reading'>('all');

  const listeningParts = TOEIC_PARTS.filter((p) => p.skill === 'listening');
  const readingParts = TOEIC_PARTS.filter((p) => p.skill === 'reading');
  const readingSecondaryParts = readingParts.filter((p) => p.part !== 7);
  const readingPart7 = readingParts.find((p) => p.part === 7);

  const showListening = activeSkillTab === 'all' || activeSkillTab === 'listening';
  const showReading = activeSkillTab === 'all' || activeSkillTab === 'reading';

  return (
    <div className="space-y-20 py-10 md:py-16">
      {/* 1. Asymmetric 2-Column Editorial Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Editorial Headline & Factual Specs */}
          <div className="lg:col-span-7 space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono uppercase tracking-wider">
                ETS Format · 7 Parts
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Listening &amp; Reading
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-foreground tracking-tight leading-[1.14]">
              Luyện thi TOEIC{' '}
              <span className="inline-block bg-primary px-2.5 py-0.5 border-2 border-border shadow-subtle mt-1">
                đúng cấu trúc,
              </span>{' '}
              rõ từng lỗi sai.
            </h1>

            <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl">
              Luyện tập theo từng Part hoặc bộ đề hoàn chỉnh. Đáp án được lưu tự động theo từng câu hỏi và hiển thị lời giải thích chi tiết ngay sau khi nộp bài.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <Link to="/quizzes">
                <Button variant="primary" size="lg" className="w-full sm:w-auto px-7">
                  Khám phá kho đề thi <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-7">
                  Xem gói hội viên
                </Button>
              </Link>
            </div>

            {/* Factual Platform Specification Strip */}
            <div className="pt-6 border-t-2 border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="font-mono text-2xl font-black text-foreground">07 Parts</p>
                <p className="text-xs text-ink-muted font-medium mt-0.5">Listening &amp; Reading</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-black text-foreground">10 lượt</p>
                <p className="text-xs text-ink-muted font-medium mt-0.5">Miễn phí mỗi ngày</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-black text-foreground">Autosave</p>
                <p className="text-xs text-ink-muted font-medium mt-0.5">Lưu từng câu hỏi</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-black text-foreground">Tự động</p>
                <p className="text-xs text-ink-muted font-medium mt-0.5">Chấm điểm &amp; giải thích</p>
              </div>
            </div>
          </div>

          {/* Right Column: Functional Exam Preview Visual (Labeled Sample) */}
          <div className="lg:col-span-5">
            <Card variant="elevated" className="overflow-hidden p-0">
              <div className="bg-ink text-surface px-4 py-2.5 flex items-center justify-between gap-2 border-b-2 border-border">
                <span className="font-mono text-xs font-bold tracking-wider uppercase">
                  Minh họa phòng thi · Part 5
                </span>
                <span className="font-mono text-xs font-bold bg-warning text-foreground px-2 py-0.5 rounded-sm border border-border">
                  01:14:20
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-4 bg-surface">
                <div className="flex items-center justify-between text-xs border-b border-border/20 pb-3">
                  <span className="font-mono font-bold text-foreground">Câu 04 / 30</span>
                  <span className="text-xs px-2 py-0.5 rounded-sm bg-success border border-border font-bold text-foreground">
                    Minh họa câu hỏi
                  </span>
                </div>

                <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                  The quarterly budget report must be submitted to the finance director _______ Friday afternoon.
                </p>

                <div className="space-y-2">
                  {[
                    { key: 'A', text: 'by', selected: true },
                    { key: 'B', text: 'until', selected: false },
                    { key: 'C', text: 'since', selected: false },
                    { key: 'D', text: 'between', selected: false },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md border text-sm ${
                        opt.selected
                          ? 'bg-primary border-2 border-border font-bold text-foreground shadow-subtle'
                          : 'bg-background border-border/40 text-foreground'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold w-6 h-6 rounded-sm border border-border bg-surface flex items-center justify-center shrink-0">
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-sm bg-muted border border-border text-xs text-foreground leading-relaxed">
                  <strong className="font-bold">Giải thích mẫu:</strong> Giới từ <em>&ldquo;by&rdquo;</em> diễn tả hạn chót hoàn thành một hành động trước một thời điểm cụ thể.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 2. 7 TOEIC Parts Grouped by Skill (Listening vs Reading) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-border pb-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Cấu trúc bài thi chuẩn quốc tế
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Phân bổ 7 phần thi Listening và Reading
            </h2>
          </div>

          <FilterButtonGroup
            options={[
              { value: 'all' as const, label: 'Tất cả 7 phần' },
              { value: 'listening' as const, label: 'Listening (1–4)', icon: Headphones },
              { value: 'reading' as const, label: 'Reading (5–7)', icon: FileText },
            ]}
            selectedValue={activeSkillTab}
            onChange={setActiveSkillTab}
          />
        </div>

        <div className="space-y-8">
          {/* Listening Wing */}
          {showListening && (
            <div className="border-2 border-border rounded-lg bg-surface overflow-hidden shadow-brutal-sm">
              <div className="bg-secondary border-b-2 border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Headphones className="h-5 w-5 text-foreground" />
                  <h3 className="text-lg font-extrabold text-foreground">
                    Kỹ năng Nghe · Listening Comprehension
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-sm border border-border bg-surface text-foreground">
                  Part 1 – Part 4 · 100 câu
                </span>
              </div>

              <div className="divide-y divide-border/20">
                {listeningParts.map((item) => (
                  <div
                    key={item.part}
                    className="p-5 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-background transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <span className="font-mono text-sm font-black px-2.5 py-1 rounded-sm border border-border bg-secondary/45 text-foreground shrink-0">
                        P{item.part}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h4 className="text-base font-extrabold text-foreground">{item.name}</h4>
                          <span className="font-mono text-xs font-bold text-ink-muted">
                            ({item.questions})
                          </span>
                        </div>
                        <p className="text-sm text-ink-muted leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    <Link to={`/quizzes?part=${item.part}`} className="shrink-0">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        Tìm đề Part {item.part} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reading Wing */}
          {showReading && (
            <div className="border-2 border-border rounded-lg bg-surface overflow-hidden shadow-brutal-sm">
              <div className="bg-primary border-b-2 border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-foreground" />
                  <h3 className="text-lg font-extrabold text-foreground">
                    Kỹ năng Đọc · Reading Comprehension
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-sm border border-border bg-surface text-foreground">
                  Part 5 – Part 7 · 100 câu
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/20">
                {readingSecondaryParts.map((item) => (
                  <div key={item.part} className="p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-sm border border-border bg-primary/60 text-foreground">
                          Part {item.part}
                        </span>
                        <span className="font-mono text-xs font-bold text-ink-muted">{item.questions}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-foreground pt-1">{item.name}</h4>
                      <p className="text-sm text-ink-muted leading-relaxed">{item.desc}</p>
                    </div>
                    <Link to={`/quizzes?part=${item.part}`} className="self-start">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        Tìm đề Part {item.part} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>

              {readingPart7 && (
                <div className="border-t border-border/20 bg-background p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-sm border border-border bg-primary text-foreground">
                        Part {readingPart7.part}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {readingPart7.questions} · Phần trọng tâm
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-foreground">
                      {readingPart7.name}
                    </h4>
                    <p className="text-sm text-ink-muted leading-relaxed">{readingPart7.desc}</p>
                  </div>
                  <Link to="/quizzes?part=7" className="shrink-0">
                    <Button variant="primary" size="sm" className="gap-1.5">
                      Luyện Part 7 <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3. Asymmetric Editorial Spread: Workflow + Core Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 3-Step Learner Journey Ledger */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Quy trình thực hành
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                3 bước luyện đề rõ ràng
              </h2>
            </div>

            <div className="border-2 border-border rounded-lg bg-surface divide-y divide-border/20 overflow-hidden">
              {[
                {
                  step: '01',
                  title: 'Chọn đề theo Part hoặc gói',
                  desc: 'Lọc đề thi theo Listening, Reading hoặc từng Part riêng lẻ trong kho đề công khai.',
                },
                {
                  step: '02',
                  title: 'Làm bài trong phòng thi tập trung',
                  desc: 'Theo dõi đồng hồ bấm giờ, đánh dấu câu phân vân và chọn đáp án qua phím tắt hoặc chuột.',
                },
                {
                  step: '03',
                  title: 'Chấm điểm và xem giải thích',
                  desc: 'Nộp bài để xem tỷ lệ câu đúng và kiểm tra lại giải thích chi tiết cho từng lựa chọn.',
                },
              ].map((item) => (
                <div key={item.step} className="p-5 flex items-start gap-4">
                  <span className="font-mono text-base font-black px-2.5 py-1 rounded-sm border border-border bg-primary text-foreground shrink-0">
                    {item.step}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-foreground">{item.title}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Core Platform Pillars */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Thiết kế cho việc học thực chất
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Nền tảng tách biệt vai trò học viên và giảng viên
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card variant="flat" className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-sm border border-border bg-primary flex items-center justify-center text-foreground">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  Tự động lưu từng đáp án (Autosave)
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Mỗi lựa chọn A–D được hệ thống ghi nhận tự động theo từng câu hỏi và thông báo kịp thời nếu việc lưu chưa hoàn tất.
                </p>
              </Card>

              <Card variant="flat" className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-sm border border-border bg-success flex items-center justify-center text-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  Đáp án và lời giải sau khi nộp
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Đáp án chuẩn cùng lời giải chi tiết từng câu được hiển thị ngay sau khi bạn nộp bài, giúp rà soát và rút kinh nghiệm cho từng câu hỏi.
                </p>
              </Card>
            </div>

            <Card variant="muted" className="p-6 flex flex-col sm:flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-sm border border-border bg-secondary flex items-center justify-center text-foreground shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-foreground">
                  Khu vực biên soạn và quản lý đề thi
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Giảng viên có thể tạo bản nháp, nhập câu hỏi hàng loạt từ file CSV, xem trước giao diện học viên và xuất bản đề thi lên kho công khai.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Editorial Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-primary border-2 border-border shadow-brutal-lg p-8 md:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-foreground">
          <div className="space-y-2.5 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border bg-surface inline-block">
              Bắt đầu miễn phí
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Sẵn sàng bắt đầu luyện đề hôm nay?
            </h2>
            <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
              Đăng ký tài khoản học viên để sử dụng ngay hạn ngạch 10 lượt luyện đề miễn phí mỗi ngày và lưu toàn bộ lịch sử làm bài.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/register">
              <Button variant="outline" size="lg" className="bg-surface font-extrabold">
                Đăng ký miễn phí
              </Button>
            </Link>
            <Link to="/quizzes">
              <Button variant="secondary" size="lg" className="font-extrabold">
                Xem kho đề thi <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
