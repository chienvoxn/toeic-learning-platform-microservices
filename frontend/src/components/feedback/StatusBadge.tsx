import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: string }) {
  switch (status.toUpperCase()) {
    case 'PUBLISHED':
      return <Badge variant="success">Đã xuất bản</Badge>;
    case 'DRAFT':
      return <Badge variant="secondary">Bản nháp</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="warning">Đang làm bài</Badge>;
    case 'GRADED':
      return <Badge variant="default">Đã chấm điểm</Badge>;
    case 'ACTIVE':
      return <Badge variant="success">Hoạt động</Badge>;
    case 'PRO':
      return <Badge variant="pro">Hội viên PRO</Badge>;
    case 'FREE':
      return <Badge variant="secondary">Miễn phí</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
