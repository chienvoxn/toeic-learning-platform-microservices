import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Card } from '@/components/atoms/Card';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card variant="elevated" className="max-w-lg w-full p-0 overflow-hidden">
        <div className="bg-destructive border-b-2 border-border px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-foreground">
            HTTP 403 · ACCESS DENIED
          </span>
          <ShieldAlert className="h-4 w-4 text-foreground" />
        </div>

        <div className="p-8 space-y-5 bg-surface">
          <div className="font-mono text-5xl font-black text-foreground tracking-tight">403</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Không có quyền truy cập
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              Tài khoản của bạn hiện không có vai trò hoặc quyền hạn phù hợp để truy cập khu vực này.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/">
              <Button variant="primary" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Trở về Trang chủ
              </Button>
            </Link>
            <Link to="/quizzes">
              <Button variant="outline">Xem kho đề thi</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
