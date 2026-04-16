import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

// Mock external dependencies so server modules can be imported without Prisma/Redis
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/cache/redis', () => ({ redis: {} }));
vi.mock('@/lib/cache/lock', () => ({ withLock: vi.fn() }));

import { createOrderSchema } from '@/server/order';
import { createProductSchema } from '@/server/catalog/product';
import { createCouponSchema } from '@/server/coupon';
import { addToCartSchema } from '@/server/cart';

// signupSchema is not exported from @/server/auth/signup, so we replicate it here for testing.
// If it becomes exported in the future, import it directly.

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    ),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다.').max(20),
  phone: z
    .string()
    .regex(/^01[0-9]-?\d{3,4}-?\d{4}$/, '올바른 휴대폰 번호를 입력해주세요.')
    .optional(),
  agreeTerms: z.literal(true, { message: '이용약관에 동의해주세요.' }),
  agreePrivacy: z.literal(true, { message: '개인정보 처리방침에 동의해주세요.' }),
  agreeMarketing: z.boolean().optional(),
});

// ============================================================
// createOrderSchema
// ============================================================

describe('createOrderSchema', () => {
  it('should accept a valid order', () => {
    const valid = {
      items: [{ skuId: 'sku-001', quantity: 2 }],
      recipientName: '홍길동',
      recipientPhone: '010-1234-5678',
      zipCode: '12345',
      shippingAddress1: '서울시 강남구',
    };
    const result = createOrderSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject an order with empty items array', () => {
    const invalid = {
      items: [],
      recipientName: '홍길동',
      recipientPhone: '010-1234-5678',
      zipCode: '12345',
      shippingAddress1: '서울시 강남구',
    };
    const result = createOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject an order with missing recipientName', () => {
    const invalid = {
      items: [{ skuId: 'sku-001', quantity: 1 }],
      recipientPhone: '010-1234-5678',
      zipCode: '12345',
      shippingAddress1: '서울시 강남구',
    };
    const result = createOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createProductSchema
// ============================================================

describe('createProductSchema', () => {
  it('should accept a valid product', () => {
    const valid = {
      categoryId: 'cat-001',
      name: 'Test Product',
      slug: 'test-product',
      basePrice: 10000,
    };
    const result = createProductSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject a product with invalid slug (uppercase)', () => {
    const invalid = {
      categoryId: 'cat-001',
      name: 'Test Product',
      slug: 'Test-Product',
      basePrice: 10000,
    };
    const result = createProductSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject a product with zero basePrice', () => {
    const invalid = {
      categoryId: 'cat-001',
      name: 'Test Product',
      slug: 'test-product',
      basePrice: 0,
    };
    const result = createProductSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createCouponSchema
// ============================================================

describe('createCouponSchema', () => {
  it('should accept a valid coupon', () => {
    const valid = {
      name: '10% Off',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
    };
    const result = createCouponSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject a coupon with empty name', () => {
    const invalid = {
      name: '',
      discountType: 'FIXED_AMOUNT' as const,
      discountValue: 5000,
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
    };
    const result = createCouponSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject a coupon with invalid discountType', () => {
    const invalid = {
      name: 'Bad Coupon',
      discountType: 'BOGO',
      discountValue: 5000,
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
    };
    const result = createCouponSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// addToCartSchema
// ============================================================

describe('addToCartSchema', () => {
  it('should accept valid cart input', () => {
    const valid = { skuId: 'sku-001', quantity: 3 };
    const result = addToCartSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject quantity of 0', () => {
    const invalid = { skuId: 'sku-001', quantity: 0 };
    const result = addToCartSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject quantity over 99', () => {
    const invalid = { skuId: 'sku-001', quantity: 100 };
    const result = addToCartSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// signupSchema (replicated since not exported)
// ============================================================

describe('signupSchema', () => {
  it('should accept a valid signup input', () => {
    const valid = {
      email: 'user@example.com',
      password: 'Abcdef1!',
      name: '홍길동',
      agreeTerms: true as const,
      agreePrivacy: true as const,
    };
    const result = signupSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject an invalid email', () => {
    const invalid = {
      email: 'not-an-email',
      password: 'Abcdef1!',
      name: '홍길동',
      agreeTerms: true as const,
      agreePrivacy: true as const,
    };
    const result = signupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject a password without special characters', () => {
    const invalid = {
      email: 'user@example.com',
      password: 'Abcdefgh1',
      name: '홍길동',
      agreeTerms: true as const,
      agreePrivacy: true as const,
    };
    const result = signupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject when agreeTerms is false', () => {
    const invalid = {
      email: 'user@example.com',
      password: 'Abcdef1!',
      name: '홍길동',
      agreeTerms: false,
      agreePrivacy: true as const,
    };
    const result = signupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
