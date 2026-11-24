import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">404 — Không tìm thấy trang</h1>
      <p className="text-slate-500 max-w-md mt-2 mb-6">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang địa chỉ khác.
      </p>
      <Link to="/">
        <Button variant="primary">Trở về Trang chủ</Button>
      </Link>
    </div>
  );
}
