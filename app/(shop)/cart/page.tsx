'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface CartItem {
  id: string;
  quantity: number;
  sku: {
    id: string;
    skuCode: string;
    price: number;
    product: { name: string; slug: string };
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
        <p className="text-muted-foreground">장바구니를 불러오는 중...</p>
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
      <h1 className="text-2xl font-bold">장바구니</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* 상품 목록 */}
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => {
            const optionText = item.sku.optionValues
              .map((v) => `${v.optionValue.productOption.name}: ${v.optionValue.value}`)
              .join(' / ');

            return (
              <div key={item.id} className="flex gap-4 rounded-lg border p-4">
                <div className="flex-1">
                  <Link
                    href={`/products/${item.sku.product.slug}`}
                    className="font-medium hover:underline"
                  >
                    {item.sku.product.name}
                  </Link>
                  {optionText && <p className="text-muted-foreground mt-1 text-sm">{optionText}</p>}
                  <p className="mt-2 font-bold">
                    {(item.sku.price * item.quantity).toLocaleString('ko-KR')}원
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button className="text-destructive text-sm" onClick={() => removeItem(item.id)}>
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
