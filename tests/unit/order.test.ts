import { describe, expect, it } from 'vitest';

// 배송비 계산 로직 테스트 (서버 로직에서 추출한 순수 함수)
const FREE_SHIPPING_THRESHOLD = 50000;
const BASE_SHIPPING_FEE = 3000;

function calculateShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
}

// 주문번호 생성 테스트
function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${random}`;
}

describe('배송비 계산', () => {
  it('50,000원 이상이면 무료배송', () => {
    expect(calculateShippingFee(50000)).toBe(0);
    expect(calculateShippingFee(100000)).toBe(0);
  });

  it('50,000원 미만이면 3,000원', () => {
    expect(calculateShippingFee(49999)).toBe(3000);
    expect(calculateShippingFee(10000)).toBe(3000);
    expect(calculateShippingFee(0)).toBe(3000);
  });

  it('정확히 경계값에서 무료', () => {
    expect(calculateShippingFee(50000)).toBe(0);
    expect(calculateShippingFee(49999)).toBe(3000);
  });
});

describe('주문번호 생성', () => {
  it('ORD- 접두사로 시작', () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
  });

  it('유니크한 주문번호 생성', () => {
    const numbers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      numbers.add(generateOrderNumber());
    }
    expect(numbers.size).toBe(100);
  });
});

describe('쿠폰 할인 계산', () => {
  function calculateCouponDiscount(
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE',
    discountValue: number,
    subtotal: number,
    maxDiscount?: number,
  ): number {
    if (discountType === 'FIXED_AMOUNT') {
      return discountValue;
    }
    let discount = Math.floor((subtotal * discountValue) / 100);
    if (maxDiscount) {
      discount = Math.min(discount, maxDiscount);
    }
    return discount;
  }

  it('정액 할인', () => {
    expect(calculateCouponDiscount('FIXED_AMOUNT', 5000, 50000)).toBe(5000);
  });

  it('정률 할인', () => {
    expect(calculateCouponDiscount('PERCENTAGE', 10, 50000)).toBe(5000);
  });

  it('정률 할인 최대 금액 적용', () => {
    expect(calculateCouponDiscount('PERCENTAGE', 50, 100000, 10000)).toBe(10000);
  });

  it('정률 할인 소수점 내림', () => {
    expect(calculateCouponDiscount('PERCENTAGE', 10, 33333)).toBe(3333);
  });
});

describe('적립금 계산', () => {
  function calculatePoints(amount: number, gradeRate: number): number {
    return Math.floor((amount * gradeRate) / 100);
  }

  it('일반 등급 1% 적립', () => {
    expect(calculatePoints(50000, 1)).toBe(500);
  });

  it('VIP 등급 5% 적립', () => {
    expect(calculatePoints(50000, 5)).toBe(2500);
  });

  it('소수점 내림 처리', () => {
    expect(calculatePoints(33333, 1)).toBe(333);
  });

  it('금액이 부동소수점 없이 정수 처리', () => {
    const result = calculatePoints(99999, 3);
    expect(Number.isInteger(result)).toBe(true);
  });
});
