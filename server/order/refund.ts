import { z } from 'zod';

import { prisma } from '@/lib/db';
import { cancelPayment } from '@/lib/payments/toss';

export const requestRefundSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(1).max(500),
});

export async function requestRefund(userId: string, input: z.infer<typeof requestRefundSchema>) {
  const { orderId, reason } = requestRefundSchema.parse(input);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order || order.userId !== userId) {
    throw new Error('주문을 찾을 수 없습니다.');
  }

  if (!['DELIVERED', 'CONFIRMED'].includes(order.status)) {
    throw new Error('환불 요청이 불가능한 주문 상태입니다.');
  }

  // 수령 후 7일 이내 확인
  const deliveredShipment = await prisma.shipment.findFirst({
    where: { orderId, status: 'DELIVERED' },
  });
  if (deliveredShipment?.deliveredAt) {
    const daysSinceDelivery = Math.floor(
      (Date.now() - deliveredShipment.deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceDelivery > 7) {
      throw new Error('수령 후 7일이 경과하여 환불이 불가능합니다.');
    }
  }

  const refund = await prisma.refund.create({
    data: {
      orderId,
      reason,
      amount: order.totalAmount,
      status: 'REQUESTED',
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'RETURN_REQUESTED' },
  });

  return refund;
}

export async function approveRefund(refundId: string) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: { order: { include: { payment: true, items: true } } },
    });

    if (!refund || refund.status !== 'REQUESTED') {
      throw new Error('환불 요청을 찾을 수 없습니다.');
    }

    // 상태 전이: REQUESTED → APPROVED → PROCESSING → COMPLETED
    await tx.refund.update({
      where: { id: refundId },
      data: { status: 'APPROVED' },
    });

    // PG 환불 처리
    await tx.refund.update({
      where: { id: refundId },
      data: { status: 'PROCESSING' },
    });

    if (refund.order.payment?.paymentKey) {
      const result = await cancelPayment(
        refund.order.payment.paymentKey,
        refund.reason,
        refund.amount,
      );
      await tx.refund.update({
        where: { id: refundId },
        data: {
          status: 'COMPLETED',
          refundKey: result.paymentKey,
          processedAt: new Date(),
        },
      });
    } else {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });
    }

    // 재고 복원
    for (const item of refund.order.items) {
      await tx.inventory.update({
        where: { skuId: item.skuId },
        data: { quantity: { increment: item.quantity } },
      });
    }

    // 주문 상태 변경
    await tx.order.update({
      where: { id: refund.orderId },
      data: { status: 'RETURNED' },
    });

    // 결제 상태 변경
    if (refund.order.payment) {
      await tx.payment.update({
        where: { id: refund.order.payment.id },
        data: { status: 'REFUNDED' },
      });
    }

    return refund;
  });
}
