/**
 * 적립금 만료 처리.
 * - expiresAt 이 지난 EARN 이력을 찾아, 동일 금액만큼 EXPIRE 이력을 기록하여 차감한다.
 * - 이미 EXPIRE/USE 로 소진된 이력은 건너뛴다 (간단한 FIFO 가정: 잔액이 양수라면 회수).
 * - 대용량일 수 있으므로 배치(default 500) 로 처리.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

async function latestBalance(userId: string): Promise<number> {
  const last = await prisma.pointHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return last?.balance ?? 0;
}

export async function expireStalePoints(options: { batchSize?: number } = {}) {
  const batchSize = options.batchSize ?? 500;
  const now = new Date();

  // 만료 가능한 EARN 이력: expiresAt < now, 아직 같은 orderId 에 대한 EXPIRE 가 없음
  const candidates = await prisma.pointHistory.findMany({
    where: {
      type: 'EARN',
      expiresAt: { lt: now, not: null },
      amount: { gt: 0 },
    },
    orderBy: { expiresAt: 'asc' },
    take: batchSize,
  });

  let expiredCount = 0;
  for (const row of candidates) {
    // 이미 EXPIRE 된 적 있는지 확인 (같은 orderId 또는 같은 reason 으로 처리된 EXPIRE)
    const already = await prisma.pointHistory.findFirst({
      where: {
        userId: row.userId,
        type: 'EXPIRE',
        reason: { contains: row.id },
      },
    });
    if (already) continue;

    const balance = await latestBalance(row.userId);
    if (balance <= 0) continue;

    const amountToExpire = Math.min(row.amount, balance);
    if (amountToExpire <= 0) continue;

    await prisma.pointHistory.create({
      data: {
        userId: row.userId,
        type: 'EXPIRE',
        amount: -amountToExpire,
        balance: balance - amountToExpire,
        reason: `유효기간 만료 (source=${row.id})`,
      },
    });
    expiredCount += 1;
  }

  logger.info('points.expire_done', { candidates: candidates.length, expired: expiredCount });
  return { candidates: candidates.length, expired: expiredCount };
}
