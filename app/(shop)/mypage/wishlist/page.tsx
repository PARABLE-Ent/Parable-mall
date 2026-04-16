'use client';

import { ChevronLeft, ChevronRight, Heart, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProductImage {
  url: string;
  altText: string | null;
}

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  listPrice: number;
  salePrice: number | null;
  status: string;
  images: ProductImage[];
}

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: WishlistProduct;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wishlists?page=${page}&limit=12`)
      .then((r) => r.json())
      .then((res: { data: WishlistItem[] | null; pagination?: Pagination; error?: string }) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setItems(res.data);
          if (res.pagination) setPagination(res.pagination);
        }
      })
      .catch(() => setError('위시리스트를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [page]);

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    try {
      const res = await fetch(`/api/wishlists/${itemId}`, { method: 'DELETE' });
      const result: { data: unknown; error?: string } = await res.json();
      if (!result.error) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        if (pagination) {
          setPagination({ ...pagination, total: pagination.total - 1 });
        }
      }
    } catch {
      // silently fail
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2">
        <Link href="/mypage">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">위시리스트</h1>
        {pagination && (
          <span className="text-muted-foreground text-sm">({pagination.total})</span>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Heart className="text-muted-foreground h-12 w-12" />
            <div className="text-center">
              <p className="font-medium">위시리스트가 비어있습니다</p>
              <p className="text-muted-foreground mt-1 text-sm">
                마음에 드는 상품을 찜해보세요.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">쇼핑하러 가기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const imageUrl = item.product.images[0]?.url;
              const price = item.product.salePrice ?? item.product.listPrice;
              const hasDiscount =
                item.product.salePrice !== null &&
                item.product.salePrice < item.product.listPrice;

              return (
                <Card key={item.id} className="overflow-hidden">
                  <Link href={`/products/${item.product.slug}`}>
                    <div className="bg-muted aspect-square">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Heart className="text-muted-foreground h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="line-clamp-2 text-sm font-medium hover:underline"
                    >
                      {item.product.name}
                    </Link>
                    <div className="mt-2 flex items-center gap-2">
                      {hasDiscount && (
                        <span className="text-muted-foreground text-xs line-through">
                          {item.product.listPrice.toLocaleString('ko-KR')}원
                        </span>
                      )}
                      <span className="font-bold">{price.toLocaleString('ko-KR')}원</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive mt-2 w-full"
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                    >
                      {removingId === item.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      삭제
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
