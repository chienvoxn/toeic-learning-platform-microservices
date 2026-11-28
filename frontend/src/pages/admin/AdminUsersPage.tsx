import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { UserDirectoryPage, DirectoryUser } from '@/types/admin';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Avatar, AvatarFallback, UserInitials } from '@/components/atoms/Avatar';
import { SearchInput } from '@/components/molecules/SearchInput';
import { Alert } from '@/components/molecules/Alert';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { RoleAssignModal } from '@/features/admin/RoleAssignModal';
import { Shield, Filter, RefreshCw } from 'lucide-react';

export function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'LEARNER' | 'TEACHER' | 'ADMIN'>('ALL');
  const [page, setPage] = useState(0);

  const [selectedUserForRole, setSelectedUserForRole] = useState<DirectoryUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger search on form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchTerm.trim());
    setPage(0);
  };

  // Fetch Users from Identity Service (/ms/v1/identity/admin/users)
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
    if (!usersPage || usersPage.size <= 0) return 0;
    return Math.ceil(usersPage.total / usersPage.size);
  }, [usersPage]);

  // Adjust out-of-range page based only on matching settled server response
  useEffect(() => {
    if (isLoading || isError || !usersPage || usersPage.page !== page) return;
    if (usersPage.total === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isLoading, isError, usersPage, page, totalPages]);

  const handleOpenRoleModal = (u: DirectoryUser) => {
    setSelectedUserForRole(u);
    setIsRoleModalOpen(true);
    setSuccessMessage(null);
  };

  const columns: Column<DirectoryUser>[] = [
    {
      key: 'displayName',
      header: 'Người dùng',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs">
              <UserInitials name={u.displayName} email={u.email} />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 max-w-xs sm:max-w-sm">
            <p className="font-extrabold text-foreground break-words" tabIndex={0} title={u.displayName || '(Chưa đặt tên)'}>
              {u.displayName || '(Chưa đặt tên)'}
            </p>
            <p className="font-mono text-xs text-ink-muted break-all select-all" tabIndex={0} title={u.email}>
              {u.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'userId',
      header: 'Mã định danh (UUID)',
      render: (u) => (
        <span
          className="font-mono text-xs text-ink-muted bg-background px-2 py-1 rounded-sm border border-border/50 inline-block"
          title={u.userId}
        >
          {u.userId.slice(0, 8)}...{u.userId.slice(-4)}
        </span>
      ),
    },
    {
      key: 'roles',
      header: 'Vai trò hiện tại',
      render: (u) => (
        <div className="flex flex-wrap gap-1.5">
          {u.roles.map((r) => {
            const variant = r === 'ADMIN' ? 'warning' : r === 'TEACHER' ? 'secondary' : 'outline';
            return (
              <Badge
                key={r}
                variant={variant}
                className={r === 'TEACHER' ? 'bg-secondary text-foreground text-[11px]' : 'text-[11px]'}
              >
                {r}
              </Badge>
            );
          })}
        </div>
      ),
    },
    {
      key: 'actions',
      header: <span className="block text-right">Thao tác</span>,
      className: 'text-right',
      render: (u) => (
        <div className="flex justify-end whitespace-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenRoleModal(u)}
          >
            <Shield className="h-3.5 w-3.5" /> Phân vai trò
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[1.5px] border-border pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Danh bạ người dùng &amp; quản trị RBAC
          </h1>
          <p className="text-sm text-ink-muted">
            Tìm kiếm tài khoản theo tên hoặc email, kiểm tra vai trò hiện có và cấp quyền mới
          </p>
        </div>
        {usersPage && (
          <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
            {usersPage.total} tài khoản
          </Badge>
        )}
      </div>

      {successMessage && (
        <Alert type="success" title="Cập nhật quyền thành công">
          {successMessage}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card variant="default" className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6">
            <SearchInput
              placeholder="Nhập tên hoặc email người dùng (nhấn Enter để tìm)..."
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                if (val === '' && debouncedQuery !== '') {
                  setDebouncedQuery('');
                  setPage(0);
                }
              }}
              aria-label="Tìm kiếm người dùng theo tên hoặc email"
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              aria-label="Lọc theo vai trò"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'ALL' | 'LEARNER' | 'TEACHER' | 'ADMIN');
                setPage(0);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả vai trò' },
                { value: 'LEARNER', label: 'Học viên (LEARNER)' },
                { value: 'TEACHER', label: 'Giảng viên (TEACHER)' },
                { value: 'ADMIN', label: 'Quản trị viên (ADMIN)' },
              ]}
            />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="md" className="w-full">
              Tìm kiếm
            </Button>
          </div>
        </form>
      </Card>

      {/* Error State or DataTable */}
      {isError ? (
        <Alert type="error" title="Lỗi tải danh bạ người dùng">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              {error instanceof Error ? error.message : 'Không thể kết nối dịch vụ định danh.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </div>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={usersPage?.users || []}
          keyExtractor={(u) => u.userId}
          isLoading={isLoading}
          emptyIcon={Filter}
          emptyTitle="Không tìm thấy người dùng"
          emptyDescription="Không có tài khoản nào khớp với từ khóa tìm kiếm hoặc bộ lọc vai trò hiện tại."
          pagination={
            usersPage && usersPage.total > usersPage.size
              ? {
                  currentPage: page,
                  totalPages,
                  onPageChange: setPage,
                  baseIndex: 0,
                  totalItems: usersPage.total,
                  pageSize: usersPage.size,
                }
              : undefined
          }
        />
      )}

      {/* Role Assignment Modal */}
      <RoleAssignModal
        user={selectedUserForRole}
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Đã cập nhật vai trò người dùng thành công!');
        }}
      />
    </div>
  );
}
