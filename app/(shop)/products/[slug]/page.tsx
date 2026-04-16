import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { getProduct } from '@/server/catalog/product';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: '상품을 찾을 수 없습니다' };

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const displayPrice = product.salePrice ?? product.basePrice;
  const isOnSale = product.salePrice !== null && product.salePrice < product.basePrice;

  return (
    <div className="container mx-auto px-4 py-8">
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
              />
            </div>
          )}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img) => (
                <div
                  key={img.id}
                  className="bg-muted relative aspect-square overflow-hidden rounded"
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground text-sm">{product.category.name}</p>
            <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{displayPrice.toLocaleString('ko-KR')}원</span>
            {isOnSale && (
              <span className="text-muted-foreground text-lg line-through">
                {product.basePrice.toLocaleString('ko-KR')}원
              </span>
            )}
          </div>

          {/* 리뷰 요약 */}
          {product._count.reviews > 0 && (
            <p className="text-muted-foreground text-sm">리뷰 {product._count.reviews}개</p>
          )}

          {/* 옵션 선택 */}
          {product.options.map((option) => (
            <div key={option.id} className="space-y-2">
              <label className="text-sm font-medium">{option.name}</label>
              <div className="flex flex-wrap gap-2">
                {option.optionValues.map((val) => (
                  <button
                    key={val.id}
                    className="hover:border-primary rounded-md border px-4 py-2 text-sm"
                  >
                    {val.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 구매 버튼 */}
          <div className="flex gap-3">
            <button className="bg-primary text-primary-foreground flex-1 rounded-md px-6 py-3 font-medium">
              장바구니 담기
            </button>
            <button className="rounded-md border px-6 py-3 font-medium">바로 구매</button>
          </div>

          {/* 설명 */}
          {product.description && (
            <div className="border-t pt-6">
              <h2 className="mb-2 font-semibold">상품 설명</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 상세 설명 (텍스트로 렌더링 — HTML은 별도 sanitizer 도입 후 전환) */}
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
                  <span className="font-medium">{review.user.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{review.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
