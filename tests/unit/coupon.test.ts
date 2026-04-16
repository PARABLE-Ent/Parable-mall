import { describe, it, expect } from 'vitest';

/**
 * Coupon discount calculation logic extracted from server/order/index.ts (createOrder).
 * This replicates the inline calculation so we can unit-test it without Prisma.
 */
interface CouponParams {
  discountType: 'FIXED_AMOUNT' | 'PERCENTAGE';
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
}

function calculateCouponDiscount(coupon: CouponParams, subtotal: number): number {
  // Check minimum order amount
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return 0;
  }

  if (coupon.discountType === 'FIXED_AMOUNT') {
    return coupon.discountValue;
  }

  // PERCENTAGE
  let discount = Math.floor((subtotal * coupon.discountValue) / 100);
  if (coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return discount;
}

// ============================================================
// FIXED_AMOUNT discount
// ============================================================

describe('Coupon discount: FIXED_AMOUNT', () => {
  it('should return the fixed discount value', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'FIXED_AMOUNT', discountValue: 5000 },
      30000,
    );
    expect(discount).toBe(5000);
  });

  it('should return 0 when subtotal is below minOrderAmount', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'FIXED_AMOUNT', discountValue: 5000, minOrderAmount: 50000 },
      30000,
    );
    expect(discount).toBe(0);
  });

  it('should apply discount when subtotal equals minOrderAmount', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'FIXED_AMOUNT', discountValue: 3000, minOrderAmount: 20000 },
      20000,
    );
    expect(discount).toBe(3000);
  });
});

// ============================================================
// PERCENTAGE discount
// ============================================================

describe('Coupon discount: PERCENTAGE', () => {
  it('should calculate percentage discount correctly', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'PERCENTAGE', discountValue: 10 },
      50000,
    );
    expect(discount).toBe(5000); // 10% of 50000
  });

  it('should floor the result for non-round percentages', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'PERCENTAGE', discountValue: 15 },
      33333,
    );
    // Math.floor(33333 * 15 / 100) = Math.floor(4999.95) = 4999
    expect(discount).toBe(4999);
  });

  it('should cap discount at maxDiscount', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'PERCENTAGE', discountValue: 20, maxDiscount: 5000 },
      100000,
    );
    // 20% of 100000 = 20000, but capped at 5000
    expect(discount).toBe(5000);
  });

  it('should not cap when discount is below maxDiscount', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'PERCENTAGE', discountValue: 10, maxDiscount: 10000 },
      50000,
    );
    // 10% of 50000 = 5000, maxDiscount is 10000, so no cap
    expect(discount).toBe(5000);
  });

  it('should return 0 when subtotal is below minOrderAmount', () => {
    const discount = calculateCouponDiscount(
      { discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 30000 },
      20000,
    );
    expect(discount).toBe(0);
  });
});
