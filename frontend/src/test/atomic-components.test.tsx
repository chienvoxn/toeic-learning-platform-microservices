import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SearchInput } from '@/components/molecules/SearchInput';
import { MetricCard } from '@/components/molecules/MetricCard';
import { Pagination } from '@/components/molecules/Pagination';
import { FilterButtonGroup } from '@/components/molecules/FilterButtonGroup';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { PageHeroBanner } from '@/components/organisms/PageHeroBanner';
import { Avatar, AvatarFallback, UserInitials } from '@/components/atoms/Avatar';
import { Progress } from '@/components/atoms/Progress';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/atoms/Tooltip';
import { SkeletonLoader, QuizCardSkeleton } from '@/components/atoms/SkeletonLoader';
import { SkeletonLoader as FeedbackSkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { Layers } from 'lucide-react';

describe('Atomic Design Atoms Unit Tests', () => {
  it('renders Button with variants and handles loading state properly', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Bắt đầu
      </Button>
    );

    const button = screen.getByRole('button', { name: /Bắt đầu/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test isLoading disables button
    rerender(
      <Button variant="primary" isLoading onClick={handleClick}>
        Bắt đầu
      </Button>
    );
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1); // not called again
  });

  it('renders Input with label, placeholder, and error message', () => {
    render(
      <Input
        label="Email học viên"
        placeholder="user@example.com"
        error="Email không hợp lệ"
      />
    );

    expect(screen.getByLabelText(/Email học viên/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Email không hợp lệ');
  });

  it('renders Select with options and handles value change', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'all', label: 'Tất cả' },
      { value: 'p1', label: 'Part 1' },
    ];

    render(
      <Select
        label="Phần thi"
        options={options}
        onChange={(e) => handleChange(e.target.value)}
      />
    );

    const select = screen.getByLabelText(/Phần thi/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'p1' } });
    expect(handleChange).toHaveBeenCalledWith('p1');
  });

  it('renders Badge and maps StatusBadge to correct labels and variants', () => {
    const { rerender } = render(<StatusBadge status="PUBLISHED" />);
    expect(screen.getByText('Đã xuất bản')).toBeInTheDocument();

    rerender(<StatusBadge status="DRAFT" />);
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();

    rerender(<StatusBadge status="GRADED" />);
    expect(screen.getByText('Đã chấm điểm')).toBeInTheDocument();

    rerender(<StatusBadge status="PRO" />);
    expect(screen.getByText('Hội viên PRO')).toBeInTheDocument();
  });

  it('renders Avatar, AvatarFallback, and formats UserInitials properly', () => {
    const { rerender } = render(
      <Avatar>
        <AvatarFallback>TM</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('TM')).toBeInTheDocument();

    rerender(<UserInitials name="Nguyễn Văn Học" />);
    expect(screen.getByText('NH')).toBeInTheDocument();

    rerender(<UserInitials email="learner@toeic.vn" />);
    expect(screen.getByText('LE')).toBeInTheDocument();
  });

  it('renders Progress with indicator translated according to value', () => {
    const { container } = render(<Progress value={75} />);
    const indicator = container.querySelector('.bg-primary');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' });
  });

  it('renders Tooltip content when open=true in TooltipProvider', () => {
    render(
      <TooltipProvider>
        <Tooltip open={true}>
          <TooltipTrigger>Nút câu hỏi</TooltipTrigger>
          <TooltipContent>Giải thích chi tiết Part 5</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    expect(screen.getByText('Nút câu hỏi')).toBeInTheDocument();
    expect(screen.getByText('Giải thích chi tiết Part 5')).toBeInTheDocument();
  });

  it('renders SkeletonLoader and ensures backward compatibility re-export', () => {
    const { container, rerender } = render(<SkeletonLoader className="h-6 w-24" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    // Re-export from feedback/SkeletonLoader should behave identically
    rerender(<FeedbackSkeletonLoader className="h-8 w-32" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    rerender(<QuizCardSkeleton />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('Atomic Design Molecules Unit Tests', () => {
  it('renders SearchInput, triggers onChange, and clears on clear button click', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();

    const { rerender } = render(
      <SearchInput
        value=""
        onChange={handleChange}
        onClear={handleClear}
        placeholder="Tìm đề thi..."
      />
    );

    const input = screen.getByPlaceholderText('Tìm đề thi...');
    fireEvent.change(input, { target: { value: 'ETS 2026' } });
    expect(handleChange).toHaveBeenCalledWith('ETS 2026');

    // With value present, clear button appears
    rerender(
      <SearchInput
        value="ETS 2026"
        onChange={handleChange}
        onClear={handleClear}
      />
    );

    const clearBtn = screen.getByRole('button', { name: /Xóa tìm kiếm/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders MetricCard with title, value, subtitle, and loading skeleton', () => {
    const { rerender } = render(
      <MetricCard
        title="Tổng số đề"
        value={42}
        subtitle="Đang quản lý"
        icon={Layers}
        colorScheme="blue"
      />
    );

    expect(screen.getByText('Tổng số đề')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Đang quản lý')).toBeInTheDocument();

    rerender(
      <MetricCard
        title="Tổng số đề"
        value={42}
        icon={Layers}
        isLoading={true}
      />
    );
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('renders Pagination correctly and disables Prev on first page and Next on last page', () => {
    const handlePageChange = vi.fn();

    const { rerender } = render(
      <Pagination
        currentPage={0}
        totalPages={3}
        onPageChange={handlePageChange}
        baseIndex={0}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /Trang trước/i });
    const nextBtn = screen.getByRole('button', { name: /Trang sau/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    // On last page
    rerender(
      <Pagination
        currentPage={2}
        totalPages={3}
        onPageChange={handlePageChange}
        baseIndex={0}
      />
    );

    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();
  });

  it('renders FilterButtonGroup and toggles selected state', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'ALL', label: 'Tất cả' },
      { value: 'FREE', label: 'Miễn phí' },
      { value: 'PRO', label: 'Hội viên PRO' },
    ];

    render(
      <FilterButtonGroup
        options={options}
        selectedValue="FREE"
        onChange={handleChange}
      />
    );

    const freeBtn = screen.getByRole('button', { name: /Miễn phí/i });
    expect(freeBtn).toHaveAttribute('aria-pressed', 'true');

    const proBtn = screen.getByRole('button', { name: /Hội viên PRO/i });
    expect(proBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(proBtn);
    expect(handleChange).toHaveBeenCalledWith('PRO');
  });

  it('renders ConfirmDialog when isOpen=true and calls onConfirm / onClose', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Xác nhận thoát"
        description="Bài thi của bạn sẽ được tự động lưu trạng thái."
        confirmText="Đồng ý thoát"
        cancelText="Ở lại"
      />
    );

    expect(screen.getByText('Xác nhận thoát')).toBeInTheDocument();
    expect(screen.getByText(/Bài thi của bạn sẽ được tự động lưu/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Đồng ý thoát/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: /Ở lại/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('Atomic Design Organisms Unit Tests', () => {
  interface TestItem {
    id: string;
    title: string;
    count: number;
  }

  const testColumns: Column<TestItem>[] = [
    { key: 'title', header: 'Tiêu đề' },
    { key: 'count', header: 'Số câu' },
  ];

  it('renders DataTable with columns and data items', () => {
    const data: TestItem[] = [
      { id: '1', title: 'TOEIC Test 1', count: 10 },
      { id: '2', title: 'TOEIC Test 2', count: 20 },
    ];

    render(
      <DataTable
        columns={testColumns}
        data={data}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('TOEIC Test 1')).toBeInTheDocument();
    expect(screen.getByText('TOEIC Test 2')).toBeInTheDocument();
  });

  it('renders DataTable empty state when data is empty array', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyTitle="Không có dữ liệu đề"
        emptyDescription="Chưa có đề nào trong hệ thống"
      />
    );

    expect(screen.getByText('Không có dữ liệu đề')).toBeInTheDocument();
    expect(screen.getByText('Chưa có đề nào trong hệ thống')).toBeInTheDocument();
  });

  it('renders PageHeroBanner with title, badge and action buttons', () => {
    render(
      <PageHeroBanner
        badgeText="Học Viên"
        title="Bàn làm việc"
        description="Chào mừng bạn quay trở lại"
        actions={<Button>Hành động</Button>}
      />
    );

    expect(screen.getByText(/Học Viên/i)).toBeInTheDocument();
    expect(screen.getByText('Bàn làm việc')).toBeInTheDocument();
    expect(screen.getByText('Chào mừng bạn quay trở lại')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hành động/i })).toBeInTheDocument();
  });
});
