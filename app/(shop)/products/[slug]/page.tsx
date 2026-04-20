import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductActions } from '@/components/shop/product-actions';
import { getProduct } from '@/server/catalog/product';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: '상품을 찾을 수 없습니다' };

  const primaryImage =
    product.images.find((img: { isPrimary: boolean }) => img.isPrimary) ?? product.images[0];

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.description,
    openGraph: {
      title: product.metaTitle ?? product.name,
      description: product.metaDescription ?? product.description ?? undefined,
      images: primaryImage
        ? [{ url: primaryImage.url, alt: primaryImage.alt ?? product.name }]
        : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const primaryImage =
    product.images.find((img: { isPrimary: boolean }) => img.isPrimary) ?? product.images[0];
  const hasStock = product.skus.some(
    (sku: { isActive: boolean; inventory: { quantity: number; reserved: number } | null }) =>
      sku.isActive && sku.inventory && sku.inventory.quantity - sku.inventory.reserved > 0,
  );

  // JSON-LD 구조화 데이터
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: primaryImage?.url,
    sku: product.skus[0]?.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KRW',
      price: product.salePrice ?? product.basePrice,
      availability: hasStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/products/${product.slug}`,
    },
    aggregateRating:
      product._count.reviews > 0
        ? {
            '@type': 'AggregateRating',
            reviewCount: product._count.reviews,
          }
        : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: '/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category.name,
        item: `/categories/${product.category.slug}`,
      },
      { '@type': 'ListItem', position: 3, name: product.name },
    ],
  };

  // SKU 데이터를 클라이언트에 전달할 수 있도록 직렬화
  const serializedSkus = product.skus.map(
    (sku: {
      id: string;
      price: number;
      isActive: boolean;
      optionValues: { optionValue: { id: string } }[];
      inventory: { quantity: number; reserved: number } | null;
    }) => ({
      id: sku.id,
      price: sku.price,
      isActive: sku.isActive,
      optionValues: sku.optionValues.map((sov: { optionValue: { id: string } }) => ({
        optionValue: { id: sov.optionValue.id },
      })),
      inventory: sku.inventory
        ? { quantity: sku.inventory.quantity, reserved: sku.inventory.reserved }
        : null,
    }),
  );

  const serializedOptions = product.options.map(
    (opt: { id: string; name: string; optionValues: { id: string; value: string }[] }) => ({
      id: opt.id,
      name: opt.name,
      optionValues: opt.optionValues.map((val: { id: string; value: string }) => ({
        id: val.id,
        value: val.value,
      })),
    }),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container mx-auto px-4 py-8">
        {/* 브레드크럼 */}
        <nav className="text-muted-foreground mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                홈
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          {/* 이미지 갤러리 */}
          <div className="space-y-4">
            {primaryImage && (
              <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt ?? product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img: { id: string; url: string; alt: string | null }) => (
                  <div
                    key={img.id}
                    className="bg-muted relative aspect-square overflow-hidden rounded"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? product.name}
                      fill
                      className="object-cover"
                      sizes="25vw"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground text-sm">
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              </p>
              <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
            </div>

            {/* 리뷰 요약 */}
            {product._count.reviews > 0 && (
              <p className="text-muted-foreground text-sm">리뷰 {product._count.reviews}개</p>
            )}

            {/* 인터랙티브 영역 (옵션 선택, 수량, 장바구니/구매) */}
            <ProductActions
              productId={product.id}
              productSlug={product.slug}
              basePrice={product.basePrice}
              salePrice={product.salePrice}
              options={serializedOptions}
              skus={serializedSkus}
              hasStock={hasStock}
            />

            {/* 설명 */}
            {product.description && (
              <div className="border-t pt-6">
                <h2 className="mb-2 font-semibold">상품 설명</h2>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* 상세 설명 */}
        {product.content && (
          <div className="mt-12 border-t pt-8">
            <h2 className="mb-4 text-xl font-bold">상세 정보</h2>
            <div className="prose max-w-none whitespace-pre-wrap">{product.content}</div>
          </div>
        )}

        {/* 리뷰 */}
        {product.reviews.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="mb-4 text-xl font-bold">리뷰 ({product._count.reviews})</h2>
            <div className="space-y-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{review.user.name ?? '익명'}</span>
                    <span
                      className="text-muted-foreground text-sm"
                      aria-label={`${review.rating}점`}
                    >
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{review.content}</p>
                  {review.images.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {review.images.map((img: { id: string; url: string }) => (
                        <div
                          key={img.id}
                          className="bg-muted relative h-16 w-16 overflow-hidden rounded"
                        >
                          <Image
                            src={img.url}
                            alt="리뷰 이미지"
                            fill
                            className="object-cover"
                            sizes="64px"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
