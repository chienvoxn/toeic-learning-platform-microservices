import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status.toUpperCase()) {
    case 'PUBLISHED':
      return <Badge variant="success" className={className}>Đã xuất bản</Badge>;
    case 'DRAFT':
      return <Badge variant="secondary" className={className}>Bản nháp</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="warning" className={className}>Đang làm bài</Badge>;
    case 'GRADED':
      return <Badge variant="default" className={className}>Đã chấm điểm</Badge>;
    case 'ACTIVE':
      return <Badge variant="success" className={className}>Hoạt động</Badge>;
    case 'PRO':
      return <Badge variant="pro" className={className}>Hội viên PRO</Badge>;
    case 'FREE':
      return <Badge variant="secondary" className={className}>Miễn phí</Badge>;
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
