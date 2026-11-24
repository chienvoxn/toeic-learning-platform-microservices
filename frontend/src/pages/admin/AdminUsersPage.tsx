import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { UserDirectoryPage, DirectoryUser } from '@/types/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { Alert } from '@/components/feedback/Alert';
import { RoleAssignModal } from '@/features/admin/RoleAssignModal';
import {
  Search,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'LEARNER' | 'TEACHER' | 'ADMIN'>('ALL');
  const [page, setPage] = useState(0);

  const [selectedUserForRole, setSelectedUserForRole] = useState<DirectoryUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger search on enter or when user stops typing
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchTerm.trim());
    setPage(0);
  };

  // 1. Fetch Users from Identity Service (/ms/v1/identity/admin/users)
  const { data: usersPage, isLoading, isError, error, refetch } = useQuery<UserDirectoryPage>({
    queryKey: ['admin-users', debouncedQuery, roleFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        role: roleFilter,
        page: page.toString(),
      });
      return apiRequest<UserDirectoryPage>(`/ms/v1/identity/admin/users?${params.toString()}`);
    },
    staleTime: 1000 * 20,
  });

  const totalPages = useMemo(() => {
    if (!usersPage) return 0;
    return Math.ceil(usersPage.total / usersPage.size);
  }, [usersPage]);

  const handleOpenRoleModal = (u: DirectoryUser) => {
    setSelectedUserForRole(u);
    setIsRoleModalOpen(true);
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Danh Bạ Người Dùng & Quản Trị RBAC</h1>
          <p className="text-xs text-slate-500">
            Xem danh sách tài khoản toàn hệ thống, tìm kiếm theo tên hoặc email và phân quyền vai trò.
          </p>
        </div>
      </div>

      {successMessage && (
        <Alert type="success" title="Thành công">
          {successMessage}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nhập tên hoặc email người dùng (bấm Enter để tìm)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="sm:col-span-4 flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'ALL' | 'LEARNER' | 'TEACHER' | 'ADMIN');
                setPage(0);
              }}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="LEARNER">Học viên (LEARNER)</option>
              <option value="TEACHER">Giảng viên (TEACHER)</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
            </select>

            <Button type="submit" variant="primary" size="sm" className="h-9 px-4 text-xs font-semibold shrink-0">
              Tìm kiếm
            </Button>
          </div>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <SkeletonLoader className="h-12 w-full rounded-md" />
            <SkeletonLoader className="h-12 w-full rounded-md" />
            <SkeletonLoader className="h-12 w-full rounded-md" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-rose-600">
              {error instanceof Error ? error.message : 'Lỗi tải danh bạ người dùng.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
              Thử lại
            </Button>
          </div>
        ) : !usersPage || usersPage.users.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy người dùng</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có tài khoản nào khớp với từ khóa tìm kiếm hoặc bộ lọc vai trò hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tên hiển thị</th>
                  <th className="py-3 px-4">Địa chỉ Email</th>
                  <th className="py-3 px-4">Mã định danh (User ID)</th>
                  <th className="py-3 px-4">Vai trò (Roles)</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usersPage.users.map((u) => {
                  return (
                    <tr key={u.userId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {u.displayName || '(Chưa đặt tên)'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {u.userId.slice(0, 13)}...
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => {
                            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                            if (r === 'ADMIN') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            if (r === 'TEACHER') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
                            return (
                              <Badge key={r} variant="outline" className={`text-[10px] ${badgeStyle}`}>
                                {r}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoleModal(u)}
                          className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Shield className="h-3 w-3 mr-1" /> Phân vai trò
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {usersPage && usersPage.total > usersPage.size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Hiển thị trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({usersPage.total} người dùng)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Trước
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2.5 text-xs"
              >
                Sau <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Role Assignment Modal */}
      <RoleAssignModal
        user={selectedUserForRole}
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage(`Đã cập nhật vai trò người dùng thành công!`);
        }}
      />
    </div>
  );
}
