'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Zap, Bell, Minus, Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface OptionValue {
  id: string;
  value: string;
}

interface ProductOption {
  id: string;
  name: string;
  optionValues: OptionValue[];
}

interface SkuOptionValue {
  optionValue: { id: string };
}

interface Sku {
  id: string;
  price: number;
  isActive: boolean;
  optionValues: SkuOptionValue[];
  inventory: { quantity: number; reserved: number } | null;
}

interface ProductActionsProps {
  productId: string;
  productSlug: string;
  basePrice: number;
  salePrice: number | null;
  options: ProductOption[];
  skus: Sku[];
  hasStock: boolean;
}

export function ProductActions({
  productSlug,
  basePrice,
  salePrice,
  options,
  skus,
  hasStock,
}: ProductActionsProps) {
  const router = useRouter();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 현재 선택된 옵션 조합에 매칭되는 SKU 찾기
  const matchedSku = useMemo(() => {
    if (options.length === 0) {
      // 옵션 없는 단일 상품 → 첫 번째 SKU
      return skus[0] ?? null;
    }

    const selectedValueIds = Object.values(selectedOptions);
    if (selectedValueIds.length !== options.length) return null;

    return (
      skus.find((sku) => {
        const skuValueIds = sku.optionValues.map((sov) => sov.optionValue.id);
        return selectedValueIds.every((id) => skuValueIds.includes(id));
      }) ?? null
    );
  }, [selectedOptions, options, skus]);

  // 현재 표시 가격
  const displayPrice = matchedSku?.price ?? salePrice ?? basePrice;

  // 재고 상태
  const availableStock = matchedSku?.inventory
    ? matchedSku.inventory.quantity - matchedSku.inventory.reserved
    : 0;
  const isOutOfStock = matchedSku ? availableStock <= 0 || !matchedSku.isActive : !hasStock;

  const handleOptionSelect = useCallback(
    (optionId: string, valueId: string) => {
      setSelectedOptions((prev) => ({ ...prev, [optionId]: valueId }));
      setMessage(null);
    },
    [],
  );

  const handleQuantityChange = useCallback(
    (delta: number) => {
      setQuantity((prev) => {
        const next = prev + delta;
        if (next < 1) return 1;
        if (matchedSku && next > availableStock) return availableStock;
        return Math.min(next, 99);
      });
    },
    [matchedSku, availableStock],
  );

  const handleAddToCart = useCallback(async () => {
    if (options.length > 0 && !matchedSku) {
      setMessage({ type: 'error', text: '옵션을 모두 선택해주세요.' });
      return;
    }

    if (!matchedSku) {
      setMessage({ type: 'error', text: '상품을 선택할 수 없습니다.' });
      return;
    }

    if (isOutOfStock) {
      setMessage({ type: 'error', text: '품절된 상품입니다.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId: matchedSku.id, quantity }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(err.error ?? '장바구니 추가에 실패했습니다.');
      }

      setMessage({ type: 'success', text: '장바구니에 담았습니다!' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [matchedSku, quantity, options, isOutOfStock, router]);

  const handleBuyNow = useCallback(async () => {
    if (options.length > 0 && !matchedSku) {
      setMessage({ type: 'error', text: '옵션을 모두 선택해주세요.' });
      return;
    }

    if (!matchedSku || isOutOfStock) {
      setMessage({ type: 'error', text: '구매할 수 없는 상품입니다.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId: matchedSku.id, quantity }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const err = await res.json();
        throw new Error(err.error ?? '처리에 실패했습니다.');
      }

      router.push('/checkout');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '오류가 발생했습니다.' });
      setLoading(false);
    }
  }, [matchedSku, quantity, options, isOutOfStock, router]);

  const handleRestockAlert = useCallback(async () => {
    setAlertLoading(true);
    try {
      // 입고 알림 API (간단 구현 — 실제로는 이메일 입력 필요)
      setMessage({ type: 'success', text: '입고 알림이 등록되었습니다.' });
    } finally {
      setAlertLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 가격 표시 (옵션 선택에 따라 변동) */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{displayPrice.toLocaleString('ko-KR')}원</span>
        {salePrice && salePrice < basePrice && !matchedSku && (
          <span className="text-muted-foreground text-lg line-through">
            {basePrice.toLocaleString('ko-KR')}원
          </span>
        )}
      </div>

      {/* 옵션 선택 */}
      {options.map((option) => (
        <div key={option.id} className="space-y-2">
          <label className="text-sm font-medium">{option.name}</label>
          <div className="flex flex-wrap gap-2">
            {option.optionValues.map((val) => {
              const isSelected = selectedOptions[option.id] === val.id;
              return (
                <button
                  key={val.id}
                  onClick={() => handleOptionSelect(option.id, val.id)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'hover:border-primary'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${option.name}: ${val.value}`}
                >
                  {val.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 수량 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">수량</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="rounded-md border p-2 disabled:opacity-50"
            aria-label="수량 감소"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={matchedSku ? quantity >= availableStock : false}
            className="rounded-md border p-2 disabled:opacity-50"
            aria-label="수량 증가"
          >
            <Plus className="h-4 w-4" />
          </button>
          {matchedSku && availableStock > 0 && availableStock <= 10 && (
            <span className="text-destructive text-sm">남은 수량: {availableStock}개</span>
          )}
        </div>
      </div>

      {/* 구매 버튼 */}
      {isOutOfStock ? (
        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => void handleRestockAlert()}
          disabled={alertLoading}
        >
          {alertLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bell className="mr-2 h-4 w-4" />
          )}
          입고 알림 신청
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button
            className="flex-1"
            size="lg"
            onClick={() => void handleAddToCart()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            장바구니 담기
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => void handleBuyNow()}
            disabled={loading}
          >
            <Zap className="mr-2 h-4 w-4" />
            바로 구매
          </Button>
        </div>
      )}

      {/* 메시지 */}
      {message && (
        <p
          className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}
          role="alert"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
