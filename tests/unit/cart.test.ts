import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies so server modules can be imported without Prisma/Redis
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/cache/redis', () => ({ redis: {} }));
vi.mock('@/lib/cache/lock', () => ({ withLock: vi.fn() }));

import { addToCartSchema, updateCartItemSchema } from '@/server/cart';

// ============================================================
// addToCartSchema
// ============================================================

describe('addToCartSchema', () => {
  it('should accept a valid input', () => {
    const result = addToCartSchema.safeParse({ skuId: 'sku-abc', quantity: 1 });
    expect(result.success).toBe(true);
  });

  it('should accept quantity of 99 (max)', () => {
    const result = addToCartSchema.safeParse({ skuId: 'sku-abc', quantity: 99 });
    expect(result.success).toBe(true);
  });

  it('should reject missing skuId', () => {
    const result = addToCartSchema.safeParse({ quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('should reject negative quantity', () => {
    const result = addToCartSchema.safeParse({ skuId: 'sku-abc', quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer quantity', () => {
    const result = addToCartSchema.safeParse({ skuId: 'sku-abc', quantity: 1.5 });
    expect(result.success).toBe(false);
  });

  it('should reject quantity exceeding 99', () => {
    const result = addToCartSchema.safeParse({ skuId: 'sku-abc', quantity: 100 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// updateCartItemSchema
// ============================================================

describe('updateCartItemSchema', () => {
  it('should accept a valid quantity', () => {
    const result = updateCartItemSchema.safeParse({ quantity: 5 });
    expect(result.success).toBe(true);
  });

  it('should accept quantity of 1 (minimum positive)', () => {
    const result = updateCartItemSchema.safeParse({ quantity: 1 });
    expect(result.success).toBe(true);
  });

  it('should reject quantity of 0', () => {
    const result = updateCartItemSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject quantity over 99', () => {
    const result = updateCartItemSchema.safeParse({ quantity: 100 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer quantity', () => {
    const result = updateCartItemSchema.safeParse({ quantity: 2.7 });
    expect(result.success).toBe(false);
  });
});
