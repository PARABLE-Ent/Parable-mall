import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/db';

export default async function HomePage() {
  const [categories, featuredProducts, newProducts] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null, isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: 5,
    }),
    prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE', isFeatured: true },
      include: { images: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  return (
    <div>
      {/* 히어로 배너 */}
      <section className="relative bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
        <div className="container mx-auto flex min-h-[420px] flex-col items-center justify-center px-4 py-16 text-center md:min-h-[520px]">
          <p className="text-sm font-medium tracking-widest text-neutral-400 uppercase">
            Parable-ENT Official Store
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold md:text-6xl">Parable Mall</h1>
          <p className="mt-4 max-w-lg text-lg text-neutral-300">
            아티스트의 감성을 담은 공식 굿즈를 만나보세요
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/categories/clothing"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-white text-black hover:bg-neutral-200',
              )}
            >
              쇼핑하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/categories/albums"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent',
              )}
            >
              앨범 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 카테고리 네비게이션 */}
      <section className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((cat: { id: string; slug: string; name: string }) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group bg-background hover:border-foreground/20 hover:bg-muted flex flex-col items-center rounded-lg border p-4 text-center transition-colors"
              >
                <div
                  className="bg-muted group-hover:bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                  aria-hidden="true"
                >
                  {cat.name === '의류' && '👕'}
                  {cat.name === '액세서리' && '💍'}
                  {cat.name === '앨범/음반' && '💿'}
                  {cat.name === '포토카드' && '🃏'}
                  {cat.name === '생활용품' && '🎁'}
                </div>
                <span className="mt-2 text-sm font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 신상품 */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">신상품</h2>
            <p className="text-muted-foreground mt-1 text-sm">새로 입고된 상품들을 확인하세요</p>
          </div>
          {/*
            TODO: 전용 "신상품" 아카이브 라우트(/products?sort=newest 또는 /new) 생성 전까지
            엉뚱한 카테고리(clothing)로 빠지는 링크는 제거. 하단 카드 자체가 네비게이션 역할 수행.
          */}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {newProducts.map(
            (product: {
              id: string;
              slug: string;
              name: string;
              images: { url: string }[];
              salePrice: number | null;
              basePrice: number;
              category: { name: string };
            }) => {
              const image = product.images[0];
              const displayPrice = product.salePrice ?? product.basePrice;
              const isOnSale = product.salePrice !== null && product.salePrice < product.basePrice;
              const discountRate = isOnSale
                ? Math.round((1 - product.salePrice! / product.basePrice) * 100)
                : 0;

              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="text-muted-foreground/30 flex h-full items-center justify-center text-4xl"
                        aria-hidden="true"
                      >
                        📦
                      </div>
                    )}
                    {isOnSale && (
                      <span className="absolute top-2 left-2 rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {discountRate}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-muted-foreground text-xs">{product.category.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium">{product.name}</p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      {isOnSale && (
                        <span className="text-sm font-bold text-red-500">{discountRate}%</span>
                      )}
                      <span className="text-sm font-bold">
                        {displayPrice.toLocaleString('ko-KR')}원
                      </span>
                      {isOnSale && (
                        <span className="text-muted-foreground text-xs line-through">
                          {product.basePrice.toLocaleString('ko-KR')}원
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            },
          )}
        </div>
      </section>

      {/* 프로모션 배너 */}
      <section className="bg-muted/30">
        <div className="container mx-auto grid gap-4 px-4 py-12 md:grid-cols-2">
          <Link
            href="/categories/albums"
            className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white"
          >
            <p className="text-sm font-medium opacity-80">NEW RELEASE</p>
            <h3 className="mt-1 text-xl font-bold">앨범 & 음반 컬렉션</h3>
            <p className="mt-1 text-sm opacity-70">최신 앨범을 만나보세요</p>
            <span className="mt-3 inline-flex items-center text-sm font-medium">
              바로가기{' '}
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/categories/accessories"
            className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white"
          >
            <p className="text-sm font-medium opacity-80">ACCESSORIES</p>
            <h3 className="mt-1 text-xl font-bold">액세서리 & 소품</h3>
            <p className="mt-1 text-sm opacity-70">일상에 특별함을 더하는 아이템</p>
            <span className="mt-3 inline-flex items-center text-sm font-medium">
              바로가기{' '}
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* 추천 상품 (isFeatured) */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold">추천 상품</h2>
          <p className="text-muted-foreground mt-1 text-sm">MD가 엄선한 인기 상품</p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {featuredProducts.map(
              (product: {
                id: string;
                slug: string;
                name: string;
                images: { url: string }[];
                salePrice: number | null;
                basePrice: number;
              }) => {
                const displayPrice = product.salePrice ?? product.basePrice;
                const isOnSale =
                  product.salePrice !== null && product.salePrice < product.basePrice;
                const discountRate = isOnSale
                  ? Math.round((1 - product.salePrice! / product.basePrice) * 100)
                  : 0;

                return (
                  <Link key={product.id} href={`/products/${product.slug}`} className="group">
                    <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="text-muted-foreground/30 flex h-full items-center justify-center text-4xl"
                          aria-hidden="true"
                        >
                          ⭐
                        </div>
                      )}
                      {isOnSale && (
                        <span className="absolute top-2 left-2 rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          {discountRate}%
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        {isOnSale && (
                          <span className="text-sm font-bold text-red-500">{discountRate}%</span>
                        )}
                        <span className="text-sm font-bold">
                          {displayPrice.toLocaleString('ko-KR')}원
                        </span>
                        {isOnSale && (
                          <span className="text-muted-foreground text-xs line-through">
                            {product.basePrice.toLocaleString('ko-KR')}원
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              },
            )}
          </div>
        </section>
      )}
    </div>
  );
}
