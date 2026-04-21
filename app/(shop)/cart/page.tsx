'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface CartItem {
  id: string;
  quantity: number;
  sku: {
    id: string;
    skuCode: string;
    price: number;
    product: {
      name: string;
      slug: string;
      images?: { url: string; alt: string | null }[];
    };
    optionValues: Array<{
      optionValue: { value: string; productOption: { name: string } };
    }>;
    inventory: { quantity: number; reserved: number } | null;
  };
}

interface Cart {
  items: CartItem[];
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cart')
      .then((r) => r.json())
      .then(setCart)
      .finally(() => setLoading(false));
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    });
    setCart(await res.json());
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/cart?itemId=${itemId}`, { method: 'DELETE' });
    setCart(await res.json());
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">장바구니</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4 rounded-lg border p-4">
                <div className="bg-muted h-20 w-20 animate-pulse rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-1/4 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-muted h-48 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">장바구니가 비어있습니다</h1>
        <p className="text-muted-foreground mt-2">상품을 추가해보세요</p>
        <Link href="/">
          <Button className="mt-4">쇼핑 계속하기</Button>
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.sku.price * item.quantity, 0);
  const shippingFee = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">장바구니</h1>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          계속 쇼핑하기
        </Link>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* 상품 목록 */}
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => {
            const optionText = item.sku.optionValues
              .map((v) => `${v.optionValue.productOption.name}: ${v.optionValue.value}`)
              .join(' / ');
            const availableStock = item.sku.inventory
              ? item.sku.inventory.quantity - item.sku.inventory.reserved
              : Infinity;
            const thumb = item.sku.product.images?.[0];

            return (
              <div key={item.id} className="flex gap-4 rounded-lg border p-4">
                {/* 썸네일 */}
                <Link
                  href={`/products/${item.sku.product.slug}`}
                  className="bg-muted relative block h-20 w-20 shrink-0 overflow-hidden rounded-md"
                  aria-label={`${item.sku.product.name} 상품 상세로 이동`}
                >
                  {thumb ? (
                    <Image
                      src={thumb.url}
                      alt={thumb.alt ?? item.sku.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div
                      className="text-muted-foreground/40 flex h-full items-center justify-center text-2xl"
                      aria-hidden="true"
                    >
                      📦
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.sku.product.slug}`}
                    className="line-clamp-2 font-medium hover:underline"
                  >
                    {item.sku.product.name}
                  </Link>
                  {optionText && <p className="text-muted-foreground mt-1 text-sm">{optionText}</p>}
                  <p className="mt-2 font-bold">
                    {(item.sku.price * item.quantity).toLocaleString('ko-KR')}원
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      className="hover:bg-muted inline-flex h-10 w-10 items-center justify-center rounded-md border disabled:opacity-50"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                      aria-label={`${item.sku.product.name} 수량 감소`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-medium"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {item.quantity}
                    </span>
                    <button
                      className="hover:bg-muted inline-flex h-10 w-10 items-center justify-center rounded-md border disabled:opacity-50"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= availableStock}
                      aria-label={`${item.sku.product.name} 수량 증가`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs"
                    onClick={() => removeItem(item.id)}
                    aria-label={`${item.sku.product.name} 장바구니에서 제거`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 결제 요약 */}
        <div className="rounded-lg border p-6">
          <h2 className="font-bold">주문 요약</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>상품 합계</span>
              <span>{subtotal.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="flex justify-between">
              <span>배송비</span>
              <span>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString('ko-KR')}원`}</span>
            </div>
            {subtotal < 50000 && (
              <p className="text-muted-foreground text-xs">
                {(50000 - subtotal).toLocaleString('ko-KR')}원 더 구매하면 무료배송
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
            <span>총 결제금액</span>
            <span>{total.toLocaleString('ko-KR')}원</span>
          </div>
          <Link href="/checkout">
            <Button className="mt-4 w-full">주문하기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
