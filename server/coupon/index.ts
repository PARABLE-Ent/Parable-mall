import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { withLock } from '@/lib/cache/lock';
import { prisma } from '@/lib/db';

export const createCouponSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(4).max(20).optional(),
  discountType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE']),
  discountValue: z.number().int().positive(),
  minOrderAmount: z.number().int().positive().optional(),
  maxDiscount: z.number().int().positive().optional(),
  categoryId: z.string().optional(),
  gradeLevel: z.enum(['NORMAL', 'SILVER', 'GOLD', 'VIP']).optional(),
  totalQuantity: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export async function createCoupon(input: z.infer<typeof createCouponSchema>) {
  const data = createCouponSchema.parse(input);

  if (data.code) {
    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) throw new Error('이미 사용 중인 쿠폰 코드입니다.');
  }

  return prisma.coupon.create({
    data: {
      ...data,
      startsAt: new Date(data.startsAt),
      expiresAt: new Date(data.expiresAt),
    },
  });
}

export async function issueCouponToUser(couponId: string, userId: string) {
  // 분산 락으로 수량 초과 발급 방지
  return withLock(`coupon-issue:${couponId}`, async () => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!coupon || !coupon.isActive) throw new Error('유효하지 않은 쿠폰입니다.');
      if (coupon.expiresAt < new Date()) throw new Error('만료된 쿠폰입니다.');
      if (coupon.totalQuantity && coupon.issuedCount >= coupon.totalQuantity) {
        throw new Error('쿠폰이 모두 소진되었습니다.');
      }

      const existing = await tx.couponIssue.findUnique({
        where: { couponId_userId: { couponId, userId } },
      });
      if (existing) throw new Error('이미 발급받은 쿠폰입니다.');

      const issue = await tx.couponIssue.create({
        data: { couponId, userId, expiresAt: coupon.expiresAt },
      });

      await tx.coupon.update({
        where: { id: couponId },
        data: { issuedCount: { increment: 1 } },
      });

      return issue;
    });
  });
}

export async function redeemCouponByCode(code: string, userId: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new Error('존재하지 않는 쿠폰 코드입니다.');
  return issueCouponToUser(coupon.id, userId);
}

export async function getUserCoupons(userId: string, limit = 20) {
  return prisma.couponIssue.findMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    include: { coupon: true },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  });
}
