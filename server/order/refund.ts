import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { withLock } from '@/lib/cache/lock';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { cancelPaymentByMethod, type ConfirmedPaymentMethod } from '@/lib/payments';

import { recalcMembership } from './membership';

export const requestRefundSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(1).max(500),
});

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

/**
 * 환불 요청 (고객).
 * - 수령 후 7일 이내만 가능.
 * - 동시에 대기 중인 환불이 있으면 거절.
 */
export async function requestRefund(userId: string, input: RequestRefundInput) {
  const { orderId, reason } = requestRefundSchema.parse(input);

  return withLock(`refund-request:${orderId}`, async () => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true, refunds: true },
      });
      if (!order || order.userId !== userId) {
        throw new Error('주문을 찾을 수 없습니다.');
      }
      if (!['DELIVERED', 'CONFIRMED', 'PAID'].includes(order.status)) {
        throw new Error('환불 요청이 불가능한 주문 상태입니다.');
      }
      const pending = order.refunds.find((r) =>
        ['REQUESTED', 'APPROVED', 'PROCESSING'].includes(r.status),
      );
      if (pending) throw new Error('이미 처리 중인 환불 요청이 있습니다.');

      // 수령 후 7일 정책 (DELIVERED 기준)
      const deliveredShipment = await tx.shipment.findFirst({
        where: { orderId, status: 'DELIVERED' },
        orderBy: { deliveredAt: 'desc' },
      });
      if (deliveredShipment?.deliveredAt) {
        const days = Math.floor(
          (Date.now() - deliveredShipment.deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (days > 7) throw new Error('수령 후 7일이 경과하여 환불이 불가능합니다.');
      }

      const refund = await tx.refund.create({
        data: {
          orderId,
          reason,
          amount: order.totalAmount,
          status: 'REQUESTED',
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'RETURN_REQUESTED' },
      });
      logger.info('refund.requested', { orderId, refundId: refund.id });
      return refund;
    });
  });
}

/**
 * 환불 승인 (관리자).
 * - 락으로 동일 환불 2중 처리 방지.
 * - PG 취소는 트랜잭션 외부에서 실행하여 장시간 DB 트랜잭션 점유를 피한다.
 * - PG 호출 실패 시 환불 상태는 REQUESTED 로 롤백.
 */
export async function approveRefund(refundId: string) {
  return withLock(`refund-approve:${refundId}`, async () => {
    // Step 1: 상태 전이 (REQUESTED → PROCESSING) 를 트랜잭션으로 안전 확보
    const lockedRefund = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: { order: { include: { payment: true, items: true } } },
      });
      if (!refund) throw new Error('환불 요청을 찾을 수 없습니다.');
      if (!['REQUESTED', 'APPROVED'].includes(refund.status)) {
        throw new Error('이미 처리 중이거나 완료된 환불입니다.');
      }
      const updated = await tx.refund.update({
        where: { id: refundId },
        data: { status: 'PROCESSING' },
      });
      return { refund, updatedStatus: updated.status };
    });

    const { refund } = lockedRefund;
    const payment = refund.order.payment;

    // Step 2: PG 취소 (외부 I/O) — 실패하면 REQUESTED 롤백
    try {
      if (payment?.paymentKey) {
        await cancelPaymentByMethod({
          method: payment.method as ConfirmedPaymentMethod,
          paymentKey: payment.paymentKey,
          amount: refund.amount,
          reason: refund.reason,
        });
      }
    } catch (err) {
      await prisma.refund.update({
        where: { id: refundId },
        data: { status: 'REQUESTED' },
      });
      logger.error('refund.pg_cancel_failed', {
        refundId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // Step 3: 완료 처리 + 재고 복원 + 등급 재계산
    return prisma.$transaction(async (tx) => {
      const completed = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          refundKey: payment?.paymentKey ?? null,
        },
      });
      // 재고 복원
      for (const item of refund.order.items) {
        await tx.inventory.update({
          where: { skuId: item.skuId },
          data: { quantity: { increment: item.quantity } },
        });
      }
      // 주문 상태
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: 'RETURNED' },
      });
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
      }

      // 구매 적립금 회수 (해당 주문 EARN 이력 역기재)
      const earn = await tx.pointHistory.findFirst({
        where: { orderId: refund.orderId, type: 'EARN' },
        orderBy: { createdAt: 'desc' },
      });
      if (earn && earn.amount > 0) {
        const last = await tx.pointHistory.findFirst({
          where: { userId: refund.order.userId },
          orderBy: { createdAt: 'desc' },
        });
        const balance = last?.balance ?? 0;
        await tx.pointHistory.create({
          data: {
            userId: refund.order.userId,
            type: 'CANCEL',
            amount: -earn.amount,
            balance: balance - earn.amount,
            reason: `환불 처리에 따른 적립 회수 (${refund.order.orderNumber})`,
            orderId: refund.orderId,
          },
        });
      }

      await recalcMembership(tx, refund.order.userId);
      logger.info('refund.completed', { refundId, orderId: refund.orderId });
      return completed;
    });
  });
}

export async function rejectRefund(refundId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: { order: true },
    });
    if (!refund) throw new Error('환불 요청을 찾을 수 없습니다.');
    if (refund.status !== 'REQUESTED') {
      throw new Error('이미 처리된 환불은 거절할 수 없습니다.');
    }
    const updated = await tx.refund.update({
      where: { id: refundId },
      data: {
        status: 'REJECTED',
        reason: `${refund.reason}\n[거절 사유] ${reason}`,
        processedAt: new Date(),
      },
    });
    // 주문 상태는 RETURN_REQUESTED → 직전 상태로 되돌리기 어려우니 DELIVERED 로 회복.
    await tx.order.update({
      where: { id: refund.orderId },
      data: { status: 'DELIVERED' },
    });
    logger.info('refund.rejected', { refundId });
    return updated;
  });
}

// 타입 재-export (관리자에서 Prisma 트랜잭션을 직접 다룰 필요가 있는 경우)
export type RefundWithOrder = Awaited<ReturnType<typeof approveRefund>>;
export type _MarkerPrisma = Prisma.TransactionClient;
