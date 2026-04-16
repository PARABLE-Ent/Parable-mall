'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Ticket,
  Star,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const SIDEBAR_LINKS = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/products', label: '상품관리', icon: Package },
  { href: '/admin/orders', label: '주문관리', icon: ShoppingCart },
  { href: '/admin/users', label: '회원관리', icon: Users },
  { href: '/admin/coupons', label: '쿠폰관리', icon: Ticket },
  { href: '/admin/reviews', label: '리뷰관리', icon: Star },
  { href: '/admin/settings', label: '설정', icon: Settings },
];

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }, [router]);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 모바일 토글 버튼 */}
      <button
        className="bg-background fixed top-3 left-3 z-50 rounded-md border p-2 shadow-sm lg:hidden"
        onClick={toggleSidebar}
        aria-label={open ? '사이드바 닫기' : '사이드바 열기'}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* 모바일 오버레이 */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      {/* 사이드바 */}
      <aside
        className={cn(
          'bg-background fixed top-0 left-0 z-40 flex h-full w-64 flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="관리자 사이드바"
      >
        {/* 로고 영역 */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            Parable Admin
          </Link>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {SIDEBAR_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 하단 로그아웃 */}
        <div className="border-t px-3 py-4">
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            aria-label="로그아웃"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
