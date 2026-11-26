import { Outlet } from 'react-router-dom';
import { PublicNavbar } from '@/components/organisms/PublicNavbar';
import { PublicFooter } from '@/components/organisms/PublicFooter';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
