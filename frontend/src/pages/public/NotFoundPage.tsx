import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Card } from '@/components/atoms/Card';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card variant="elevated" className="max-w-lg w-full p-0 overflow-hidden">
        <div className="bg-warning border-b-2 border-border px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-foreground">
            HTTP 404 · PAGE NOT FOUND
          </span>
          <FileQuestion className="h-4 w-4 text-foreground" />
        </div>

        <div className="p-8 space-y-5 bg-surface">
          <div className="font-mono text-5xl font-black text-foreground tracking-tight">404</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Không tìm thấy trang
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              Trang bạn đang truy cập không tồn tại hoặc đường dẫn đã thay đổi.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/">
              <Button variant="primary" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Trở về Trang chủ
              </Button>
            </Link>
            <Link to="/quizzes">
              <Button variant="outline">Kho đề thi TOEIC</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
