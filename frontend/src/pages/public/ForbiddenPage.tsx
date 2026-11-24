import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">403 — Không có quyền truy cập</h1>
      <p className="text-slate-500 max-w-md mt-2 mb-6">
        Tài khoản của bạn không có vai trò hoặc quyền hạn phù hợp để thao tác trên khu vực này.
      </p>
      <Link to="/">
        <Button variant="outline">Trở về Trang chủ</Button>
      </Link>
    </div>
  );
}
