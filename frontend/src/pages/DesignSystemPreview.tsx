import { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Progress,
  QuizCardSkeleton,
  Select,
  SkeletonLoader,
  StatusBadge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  UserInitials,
} from '@/components/atoms';
import {
  Alert,
  EmptyState,
  FilterButtonGroup,
  MetricCard,
  Pagination,
  SearchInput,
} from '@/components/molecules';
import { formatPartName, formatTime } from '@/lib/utils';
import { BookOpen, Clock, Info, Layers, ShieldCheck, Trash2 } from 'lucide-react';

const COLOR_TOKENS = [
  { name: 'Canvas', token: 'bg-background', hex: '#F7F5EE', role: 'Nền giấy ấm toàn trang' },
  { name: 'Surface', token: 'bg-surface', hex: '#FFFFFF', role: 'Card, Dialog, Table Row' },
  { name: 'Ink', token: 'bg-ink text-surface', hex: '#171717', role: 'Chữ chính, tiêu đề, viền' },
  { name: 'Muted Ink', token: 'bg-ink-muted text-surface', hex: '#525252', role: 'Chú thích & văn bản phụ' },
  { name: 'Primary', token: 'bg-primary text-primary-foreground', hex: '#FDE047', role: 'CTA chính, Active focus' },
  { name: 'Secondary', token: 'bg-secondary text-secondary-foreground', hex: '#B9C8FF', role: 'Listening / Accent phụ' },
  { name: 'Success', token: 'bg-success text-success-foreground', hex: '#D5F0BE', role: 'Published / Active' },
  { name: 'Warning', token: 'bg-warning text-warning-foreground', hex: '#FED7AA', role: 'In Progress / Notice' },
  { name: 'Destructive', token: 'bg-destructive text-destructive-foreground', hex: '#FFA69E', role: 'Error / Destructive' },
] as const;

const SAMPLE_QUIZ_ROWS = [
  { id: 'Q-201', title: 'Sample Listening Part 1 Set A', part: 1, questions: 6, tier: 'FREE', status: 'PUBLISHED', version: 'v2' },
  { id: 'Q-202', title: 'Sample Reading Part 5 Grammar Drill', part: 5, questions: 30, tier: 'PRO', status: 'PUBLISHED', version: 'v4' },
  { id: 'Q-203', title: 'Sample Reading Part 7 Passage Draft', part: 7, questions: 15, tier: 'PRO', status: 'DRAFT', version: 'v1' },
  { id: 'Q-204', title: 'Sample Listening Part 2 Rapid Response', part: 2, questions: 25, tier: 'FREE', status: 'IN_PROGRESS', version: 'v3' },
] as const;

export function DesignSystemPreview() {
  const [emailSample, setEmailSample] = useState('');
  const [passwordSample, setPasswordSample] = useState('1234');
  const [partSample, setPartSample] = useState('5');
  const [progressValue, setProgressValue] = useState(65);
  const [searchSample, setSearchSample] = useState('');
  const [filterSample, setFilterSample] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');
  const [pageSample, setPageSample] = useState(0);

  const passwordError =
    passwordSample.length > 0 && passwordSample.length < 8
      ? 'Mật khẩu tối thiểu phải từ 8 ký tự.'
      : undefined;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
        {/* Editorial Masthead */}
        <header className="border-b-2 border-border pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">DEV ONLY PREVIEW</Badge>
              <Badge variant="outline" className="font-mono">Waves 1–3 Showcase</Badge>
              <Badge variant="secondary">Sample Data — No API Calls</Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.08]">
              TOEIC Master — Editorial Design System
            </h1>
            <p className="text-base text-ink-muted max-w-2xl leading-relaxed">
              Hệ thống tokens, 12 Atomic Primitives và Shared Molecules theo hướng{' '}
              <strong className="text-foreground">Premium Editorial Neo Brutalism</strong>:
              chữ mực than trên nền giấy ấm, phân cấp viền có chủ đích và không sử dụng gradient hay blur.
            </p>
          </div>
          <div className="lg:col-span-4">
            <Card variant="muted" className="p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                <strong>Phạm vi:</strong> Dữ liệu mẫu tĩnh nội bộ ở chế độ development để kiểm duyệt trực quan. Không gọi API hay sử dụng dữ liệu người dùng thật.
              </p>
            </Card>
          </div>
        </header>

        {/* 01. Color Tokens */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">01</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Color Tokens</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {COLOR_TOKENS.map((item) => (
              <Card key={item.name} variant="flat" className="p-4 space-y-3">
                <div
                  className={`h-16 rounded-sm border-[1.5px] border-border flex items-end justify-between p-2.5 font-mono text-xs font-bold ${item.token}`}
                >
                  <span>{item.name}</span>
                  <span>{item.hex}</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">{item.role}</p>
                  <p className="font-mono text-xs text-ink-muted">{item.token}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 02. Typography Scale */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">02</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Typography &amp; Vietnamese Readability</h2>
          </div>

          <Card variant="flat" className="p-6 space-y-6">
            <div className="space-y-1.5 border-b border-border/20 pb-4">
              <span className="font-mono text-xs text-ink-muted">Display — text-4xl font-black tracking-tight</span>
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Luyện Đề Đọc Hiểu &amp; Nghe Hiểu Có Hệ Thống
              </p>
            </div>
            <div className="space-y-1.5 border-b border-border/20 pb-4">
              <span className="font-mono text-xs text-ink-muted">Body Copy — text-base text-foreground leading-relaxed</span>
              <p className="text-base text-foreground leading-relaxed max-w-3xl">
                Kiểm tra hiển thị dấu tiếng Việt trên nền giấy ấm #F7F5EE và thẻ trắng #FFFFFF. Độ tương phản mực #171717 đạt chuẩn đọc dài hạn trong phòng thi trực tuyến.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <div>
                <span className="block text-xs font-bold text-ink-muted mb-1">Timer (Monospace)</span>
                <span className="font-mono text-2xl font-bold px-3 py-1 bg-warning border border-border rounded-sm">
                  {formatTime(4485)}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-ink-muted mb-1">Quota Metric (Monospace)</span>
                <span className="font-mono text-2xl font-bold px-3 py-1 bg-surface border border-border rounded-sm">
                  08 / 10
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-ink-muted mb-1">Phiên bản đề thi (Version)</span>
                <span className="font-mono text-sm font-bold px-2.5 py-1 bg-muted border border-border rounded-sm inline-block">
                  v12 · Phiên bản hiện tại
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* 03. Border Hierarchy & Shadows */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">03</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Surface &amp; Shadow Hierarchy</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card variant="flat" className="p-5 space-y-2">
              <p className="font-mono text-xs font-bold">flat (1px · no shadow)</p>
              <p className="text-sm font-bold">Flat Surface</p>
              <p className="text-sm text-ink-muted">Bảng dữ liệu, form tĩnh và danh sách mật độ cao.</p>
            </Card>
            <Card variant="muted" className="p-5 space-y-2">
              <p className="font-mono text-xs font-bold">muted (1px · #EDEAE0)</p>
              <p className="text-sm font-bold">Muted Surface</p>
              <p className="text-sm text-ink-muted">Ghi chú kỹ thuật, callout nhẹ và nhóm điều khiển.</p>
            </Card>
            <Card variant="default" className="p-5 space-y-2">
              <p className="font-mono text-xs font-bold">default (1.5px · 2px offset)</p>
              <p className="text-sm font-bold">Default Card</p>
              <p className="text-sm text-ink-muted">Thẻ đề thi và MetricCard tiêu chuẩn.</p>
            </Card>
            <Card variant="elevated" className="p-5 space-y-2">
              <p className="font-mono text-xs font-bold">elevated (2px · 3px offset)</p>
              <p className="text-sm font-bold">Elevated Card</p>
              <p className="text-sm text-ink-muted">Thẻ nhấn mạnh, gói PRO hoặc khu vực hành động chính.</p>
            </Card>
          </div>
        </section>

        {/* 04. Buttons */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">04</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Button Variants &amp; States</h2>
          </div>

          <Card variant="flat" className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" /> Destructive
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/20">
              <Button variant="primary" size="sm">SM</Button>
              <Button variant="primary" size="md">MD</Button>
              <Button variant="primary" size="lg">LG</Button>
              <Button variant="outline" size="icon" aria-label="Biểu tượng sách">
                <BookOpen className="h-4 w-4" />
              </Button>
              <Button variant="primary" isLoading>Đang xử lý</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Card>
        </section>

        {/* 05. Inputs & Selects */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">05</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Inputs, Selects &amp; Validation</h2>
          </div>

          <Card variant="flat" className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Email học viên (Mẫu)"
              placeholder="sample.learner@toeic.demo"
              value={emailSample}
              onChange={(e) => setEmailSample(e.target.value)}
            />
            <Input
              label="Kiểm tra lỗi validation (Thử nhập >= 8 ký tự)"
              type="password"
              value={passwordSample}
              onChange={(e) => setPasswordSample(e.target.value)}
              error={passwordError}
            />
            <Select
              label="Chọn phần thi TOEIC (Mẫu)"
              value={partSample}
              onChange={(e) => setPartSample(e.target.value)}
              options={[
                { value: '1', label: 'Part 1 — Photographs' },
                { value: '2', label: 'Part 2 — Question-Response' },
                { value: '5', label: 'Part 5 — Incomplete Sentences' },
                { value: '7', label: 'Part 7 — Reading Comprehension' },
              ]}
            />
            <Input label="Trường bị khóa (Disabled)" value="sample-locked-value" disabled readOnly />
          </Card>
        </section>

        {/* 06. Badges & StatusBadge */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">06</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Badges &amp; StatusBadge</h2>
          </div>

          <Card variant="flat" className="p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="pro">PRO</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-border/20">
              <StatusBadge status="PUBLISHED" />
              <StatusBadge status="DRAFT" />
              <StatusBadge status="IN_PROGRESS" />
              <StatusBadge status="GRADED" />
              <StatusBadge status="ACTIVE" />
              <StatusBadge status="PRO" />
              <StatusBadge status="FREE" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-border/20">
              {[1, 2, 5, 7].map((part) => (
                <div
                  key={part}
                  className="flex items-center justify-between p-3 rounded-md border border-border bg-background"
                >
                  <span className="text-sm font-semibold text-foreground">{formatPartName(part)}</span>
                  <Badge variant={part <= 4 ? 'secondary' : 'outline'}>
                    {part <= 4 ? 'Listening' : 'Reading'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* 07. Shared Molecules (Wave 3) */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">07</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Shared Molecules (Wave 3)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Đề Mẫu (Sample)"
              value="12"
              subtitle="Listening & Reading"
              icon={Layers}
              colorScheme="blue"
            />
            <MetricCard
              title="Đã Chấm"
              value="84%"
              subtitle="Sample accuracy"
              icon={ShieldCheck}
              colorScheme="emerald"
              trend={{ value: '6%', positive: true }}
            />
            <MetricCard
              title="Hạn Ngạch"
              value="8/10"
              subtitle="Lượt mỗi ngày"
              icon={Clock}
              colorScheme="amber"
            />
            <MetricCard
              title="Cần Ôn"
              value="03"
              subtitle="Phần đọc hiểu"
              icon={BookOpen}
              colorScheme="indigo"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert type="info" title="Thông báo thông tin (Info)">
              Hệ thống tự động lưu đáp án theo từng câu hỏi trong phiên làm bài.
            </Alert>
            <Alert type="success" title="Trạng thái thành công (Success)">
              Bản nháp đề thi đã được lưu với số phiên bản mới.
            </Alert>
            <Alert type="warning" title="Cảnh báo hạn ngạch (Warning)">
              Gói FREE hỗ trợ tối đa 10 lượt luyện đề mỗi ngày.
            </Alert>
            <Alert type="error" title="Lỗi xung đột (Error)">
              Phiên bản bản nháp đã thay đổi trên máy chủ (HTTP 409).
            </Alert>
          </div>

          <Card variant="flat" className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="flex-1">
                <SearchInput
                  value={searchSample}
                  onChange={setSearchSample}
                  placeholder="Tìm kiếm mẫu trong showcase..."
                />
              </div>
              <FilterButtonGroup
                options={[
                  { value: 'ALL', label: 'Tất cả', count: 12 },
                  { value: 'FREE', label: 'Miễn phí', count: 8 },
                  { value: 'PRO', label: 'PRO', count: 4 },
                ]}
                selectedValue={filterSample}
                onChange={setFilterSample}
              />
            </div>
            <Pagination
              currentPage={pageSample}
              totalPages={4}
              totalItems={32}
              pageSize={8}
              onPageChange={setPageSample}
            />
          </Card>

          <EmptyState
            title="Ví dụ EmptyState (Sample)"
            description="Hiển thị khi người dùng lọc không có kết quả phù hợp."
            actionText="Đặt lại bộ lọc mẫu"
            onAction={() => {
              setSearchSample('');
              setFilterSample('ALL');
            }}
          />
        </section>

        {/* 08. Dialog & Table */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">08</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Dialog &amp; Table</h2>
          </div>

          <Card variant="flat" className="p-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-foreground">
              Kiểm tra Dialog Radix UI với overlay không blur và focus trap.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="primary">Mở Dialog Mẫu</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Hộp thoại xác nhận (Sample)</DialogTitle>
                  <DialogDescription>
                    Dùng <code className="font-mono">atoms/Dialog.tsx</code> với Radix focus management.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Đóng</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="primary">Xác nhận</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          <Card variant="flat" className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted">
                  <TableHead>Mã đề (Sample)</TableHead>
                  <TableHead>Tiêu đề đề thi</TableHead>
                  <TableHead>Phần thi</TableHead>
                  <TableHead>Số câu</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Phiên bản</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_QUIZ_ROWS.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-bold">{row.id}</TableCell>
                    <TableCell className="font-semibold">{row.title}</TableCell>
                    <TableCell>Part {row.part}</TableCell>
                    <TableCell className="font-mono">{row.questions}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.tier} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="font-mono">{row.version}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>Dữ liệu mẫu (Sample Data Only) — Không gọi API.</TableCaption>
            </Table>
          </Card>
        </section>

        {/* 09. Avatar, Progress, Tooltip & Skeletons */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3 border-b border-border/20 pb-2">
            <span className="font-mono text-sm font-bold bg-primary px-2 py-0.5 border border-border rounded-sm">09</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Avatar, Progress, Tooltip &amp; Skeletons</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="flat" className="p-6 space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase text-ink-muted">Avatar &amp; Initials</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    <UserInitials name="Nguyễn Minh Anh" />
                  </AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>
                    <UserInitials email="teacher@sample.vn" />
                  </AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </div>
            </Card>

            <Card variant="flat" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold uppercase text-ink-muted">Progress</h3>
                <span className="font-mono text-sm font-bold">{progressValue}%</span>
              </div>
              <Progress value={progressValue} aria-label="Tiến độ mẫu" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setProgressValue((v) => Math.max(0, v - 15))}>
                  -15%
                </Button>
                <Button size="sm" variant="outline" onClick={() => setProgressValue((v) => Math.min(100, v + 15))}>
                  +15%
                </Button>
              </div>
            </Card>

            <Card variant="flat" className="p-6 space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase text-ink-muted">Tooltip (Radix)</h3>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">Di chuột hoặc focus để xem Tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>Tooltip nền mực #171717 chữ trắng rõ nét</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card variant="flat" className="p-6 space-y-3">
              <span className="font-mono text-xs font-bold uppercase text-ink-muted block">SkeletonLoader</span>
              <SkeletonLoader className="h-6 w-2/3" />
              <SkeletonLoader className="h-4 w-full" />
              <SkeletonLoader className="h-10 w-36" />
            </Card>
            <QuizCardSkeleton />
          </div>
        </section>

        {/* Sample Card Footer Verification */}
        <section className="space-y-4">
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">Part 5 · Sample</Badge>
                <Badge variant="pro">PRO</Badge>
              </div>
              <CardTitle className="pt-2">Sample Elevated Card Composition</CardTitle>
              <CardDescription>Kiểm tra phân cấp CardHeader, CardContent và CardFooter.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-foreground">
              Thể hiện rõ sự tương phản giữa nội dung và hai nút hành động bên dưới.
            </CardContent>
            <CardFooter className="gap-3">
              <Button variant="primary">Bắt đầu thử</Button>
              <Button variant="outline">Chi tiết</Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  );
}
