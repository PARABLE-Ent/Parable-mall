import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies so server modules can be imported without Prisma/Redis
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/cache/redis', () => ({ redis: {} }));
vi.mock('@/lib/cache/lock', () => ({ withLock: vi.fn() }));

import { calculateShippingFee } from '@/server/order';

describe('calculateShippingFee', () => {
  it('should charge 3000 for subtotal below 50000', () => {
    expect(calculateShippingFee(0)).toBe(3000);
    expect(calculateShippingFee(10000)).toBe(3000);
    expect(calculateShippingFee(49999)).toBe(3000);
  });

  it('should be free at exactly 50000', () => {
    expect(calculateShippingFee(50000)).toBe(0);
  });

  it('should be free above 50000', () => {
    expect(calculateShippingFee(50001)).toBe(0);
    expect(calculateShippingFee(100000)).toBe(0);
  });
});
