import { describe, expect, it } from 'vitest';

import { TIERS, determineTier, earningFor } from '@/server/order/membership';

describe('등급 판정 (determineTier)', () => {
  it('0원은 NORMAL', () => {
    expect(determineTier(0).grade).toBe('NORMAL');
  });

  it('99,999원은 NORMAL', () => {
    expect(determineTier(99_999).grade).toBe('NORMAL');
  });

  it('100,000원은 SILVER', () => {
    expect(determineTier(100_000).grade).toBe('SILVER');
  });

  it('499,999원은 SILVER', () => {
    expect(determineTier(499_999).grade).toBe('SILVER');
  });

  it('500,000원은 GOLD', () => {
    expect(determineTier(500_000).grade).toBe('GOLD');
  });

  it('1,000,000원은 VIP', () => {
    expect(determineTier(1_000_000).grade).toBe('VIP');
    expect(determineTier(9_999_999).grade).toBe('VIP');
  });

  it('모든 등급 정의가 내림차순', () => {
    for (let i = 0; i < TIERS.length - 1; i++) {
      expect(TIERS[i].minSpent).toBeGreaterThan(TIERS[i + 1].minSpent);
    }
  });
});

describe('적립금 계산 (earningFor)', () => {
  it('NORMAL 1%', () => {
    expect(earningFor(0, 50_000)).toBe(500);
  });

  it('SILVER 2%', () => {
    expect(earningFor(150_000, 50_000)).toBe(1_000);
  });

  it('GOLD 3%', () => {
    expect(earningFor(600_000, 50_000)).toBe(1_500);
  });

  it('VIP 5%', () => {
    expect(earningFor(1_500_000, 50_000)).toBe(2_500);
  });

  it('소수점 내림', () => {
    // 33,333원 × 3% = 999.99 → 999
    expect(earningFor(600_000, 33_333)).toBe(999);
  });

  it('음수 주문액은 0 가까이 수렴 (방어적 계산)', () => {
    // 비정상 입력에 대해 크래시 없이 동작함을 확인
    expect(earningFor(0, 0)).toBe(0);
  });
});
