/**
 * 회원 등급 재계산 + 구매 적립금 적립.
 *
 * CLAUDE.md 비즈니스 정책 기준:
 *  - 일반   : 0원~            적립률 1%
 *  - 실버   : 10만원~          적립률 2%
 *  - 골드   : 50만원~          적립률 3%
 *  - VIP    : 100만원~         적립률 5%
 *
 * `totalSpent` 는 취소되지 않은 주문의 totalAmount 합계로 재계산한다.
 * 적립금은 주문 확정 (PAID) 시점에 그 시점 등급 기준으로 지급한다.
 */

import type { Prisma } from '@prisma/client';

export type TierGrade = 'NORMAL' | 'SILVER' | 'GOLD' | 'VIP';

export interface TierInfo {
  grade: TierGrade;
  minSpent: number;
  earnRatePercent: number;
}

export const TIERS: TierInfo[] = [
  { grade: 'VIP', minSpent: 1_000_000, earnRatePercent: 5 },
  { grade: 'GOLD', minSpent: 500_000, earnRatePercent: 3 },
  { grade: 'SILVER', minSpent: 100_000, earnRatePercent: 2 },
  { grade: 'NORMAL', minSpent: 0, earnRatePercent: 1 },
];

export function determineTier(totalSpent: number): TierInfo {
  for (const tier of TIERS) {
    if (totalSpent >= tier.minSpent) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export function earningFor(totalSpent: number, orderAmount: number): number {
  const tier = determineTier(totalSpent);
  return Math.floor((orderAmount * tier.earnRatePercent) / 100);
}

/**
 * 트랜잭션 내에서 유저의 누적 구매액을 재계산하고 등급을 업데이트한다.
 * - `CANCELLED`, `RETURNED` 주문은 제외.
 * - PENDING_PAYMENT 는 아직 결제 전이므로 제외.
 */
export async function recalcMembership(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ totalSpent: number; grade: TierGrade }> {
  const agg = await tx.order.aggregate({
    where: {
      userId,
      status: { notIn: ['CANCELLED', 'RETURNED', 'PENDING_PAYMENT'] },
    },
    _sum: { totalAmount: true },
  });
  const totalSpent = agg._sum.totalAmount ?? 0;
  const tier = determineTier(totalSpent);
  await tx.user.update({
    where: { id: userId },
    data: { totalSpent, gradeLevel: tier.grade },
  });
  return { totalSpent, grade: tier.grade };
}
