'use client';

import { useState, useCallback, useEffect } from 'react';
import { ShoppingCart, User, LogIn, Menu, X, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/categories/clothing', label: '의류' },
  { href: '/categories/accessories', label: '액세서리' },
  { href: '/categories/albums', label: '앨범/음반' },
  { href: '/categories/photocards', label: '포토카드' },
  { href: '/categories/lifestyle', label: '생활용품' },
];

function readInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage?.getItem('theme') as 'light' | 'dark' | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readInitialTheme());
  const pathname = usePathname();

  // 초기 테마를 html 클래스에 반영 (외부 시스템 동기화이므로 effect 가 적합)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // 경로 변경 시 모바일 메뉴 닫기 (이전 pathname 과 비교하여 불필요한 setState 방지)
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        window.localStorage.setItem('theme', next);
      } catch {
        // localStorage 사용 불가 환경 무시
      }
      return next;
    });
  }, []);

  return (
    <>
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* 모바일 메뉴 토글 */}
          <button
            className="mr-2 md:hidden"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            onClick={toggleMenu}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
              aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <Link
              href="/cart"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
              aria-label="장바구니"
            >
              <ShoppingCart className="h-5 w-5" />
            </Link>
            {isAuthenticated ? (
              <Link
                href="/mypage"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                aria-label="마이페이지"
              >
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'ml-1 hidden sm:inline-flex',
                )}
              >
                <LogIn className="mr-1 h-4 w-4" />
                로그인
              </Link>
            )}
            {!isAuthenticated && (
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'sm:hidden')}
                aria-label="로그인"
              >
                <LogIn className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 모바일 슬라이드 메뉴 */}
      {/* 배경 오버레이 */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={toggleMenu}
        aria-hidden="true"
      />

      {/* 슬라이드 패널 */}
      <nav
        className={cn(
          'bg-background fixed top-0 left-0 z-50 flex h-full w-72 flex-col shadow-xl transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="모바일 네비게이션"
        role="dialog"
        aria-modal={mobileMenuOpen}
      >
        {/* 메뉴 헤더 */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-lg font-bold">메뉴</span>
          <button onClick={toggleMenu} aria-label="메뉴 닫기">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 카테고리 링크 */}
        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'block rounded-md px-4 py-3 text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 하단 유틸 링크 */}
        <div className="border-t px-4 py-4">
          <div className="space-y-1">
            {isAuthenticated ? (
              <Link
                href="/mypage"
                className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors"
              >
                <User className="h-4 w-4" />
                마이페이지
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Link>
            )}
            <Link
              href="/cart"
              className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              장바구니
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
