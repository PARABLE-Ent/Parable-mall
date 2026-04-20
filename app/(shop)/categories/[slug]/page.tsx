import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/db';
import { listProducts } from '@/server/catalog/product';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: '카테고리를 찾을 수 없습니다' };

  return {
    title: category.name,
    openGraph: {
      title: category.name,
      ...(category.imageUrl && { images: [{ url: category.imageUrl }] }),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await prisma.category.findUnique({
    where: { slug, deletedAt: null },
    include: {
      children: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!category) notFound();

  const page = Number(sp.page) || 1;
  const sort = (sp.sort as 'newest' | 'price_asc' | 'price_desc' | 'name') ?? 'newest';

  const { products, pagination } = await listProducts({
    page,
    limit: 20,
    categoryId: category.id,
    status: 'ACTIVE',
    sort,
  });

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: '/' },
      { '@type': 'ListItem', position: 2, name: category.name },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">{category.name}</h1>

        {/* 하위 카테고리 */}
        {category.children.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {category.children.map((child: { id: string; slug: string; name: string }) => (
              <Link
                key={child.id}
                href={`/categories/${child.slug}`}
                className="hover:bg-muted rounded-full border px-4 py-1.5 text-sm"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        {/* 정렬 */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">총 {pagination.total}개의 상품</p>
          <div className="flex gap-2 text-sm">
            {[
              { value: 'newest', label: '최신순' },
              { value: 'price_asc', label: '낮은가격순' },
              { value: 'price_desc', label: '높은가격순' },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={`/categories/${slug}?sort=${opt.value}`}
                className={`px-2 py-1 ${sort === opt.value ? 'text-primary font-bold' : 'text-muted-foreground'}`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 상품 그리드 */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map(
            (product: {
              id: string;
              slug: string;
              name: string;
              images: { url: string }[];
              salePrice: number | null;
              basePrice: number;
              status: string;
              category: { name: string };
              _count: { reviews: number };
            }) => {
              const image = product.images[0];
              const displayPrice = product.salePrice ?? product.basePrice;

              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                    {image && (
                      <Image
                        src={image.url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    )}
                    {product.status === 'SOLDOUT' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="font-bold text-white">품절</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-muted-foreground text-xs">{product.category.name}</p>
                    <p className="mt-0.5 text-sm leading-tight font-medium">{product.name}</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-bold">{displayPrice.toLocaleString('ko-KR')}원</span>
                      {product.salePrice !== null && product.salePrice < product.basePrice && (
                        <span className="text-muted-foreground text-xs line-through">
                          {product.basePrice.toLocaleString('ko-KR')}원
                        </span>
                      )}
                    </div>
                    {product._count.reviews > 0 && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        리뷰 {product._count.reviews}
                      </p>
                    )}
                  </div>
                </Link>
              );
            },
          )}
        </div>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/categories/${slug}?page=${p}&sort=${sort}`}
                className={`rounded px-3 py-1.5 text-sm ${
                  p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted border'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
