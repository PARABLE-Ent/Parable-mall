import { ShoppingCart, Search, User, Menu } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/categories/clothing', label: '의류' },
  { href: '/categories/accessories', label: '액세서리' },
  { href: '/categories/albums', label: '앨범/음반' },
  { href: '/categories/photocards', label: '포토카드' },
  { href: '/categories/lifestyle', label: '생활용품' },
];

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* 모바일 메뉴 */}
        <button className="mr-2 md:hidden" aria-label="메뉴 열기">
          <Menu className="h-6 w-6" />
        </button>

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">Parable Mall</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex md:items-center md:gap-6" aria-label="메인 네비게이션">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 우측 액션 */}
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
            aria-label="장바구니"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
            aria-label="마이페이지"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
