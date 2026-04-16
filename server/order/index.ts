import { z } from 'zod';

import { withLock } from '@/lib/cache/lock';
import { prisma } from '@/lib/db';

// ============================================================
// Schemas
// ============================================================

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        skuId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  addressId: z.string().optional(),
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(1),
  zipCode: z.string().min(1),
  shippingAddress1: z.string().min(1),
  shippingAddress2: z.string().optional(),
  shippingMemo: z.string().optional(),
  couponIssueId: z.string().optional(),
  pointsUsed: z.number().int().min(0).default(0),
});

// ============================================================
// 주문번호 생성
// ============================================================

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${random}`;
}

// ============================================================
// 배송비 계산
// ============================================================

const FREE_SHIPPING_THRESHOLD = 50000;
const BASE_SHIPPING_FEE = 3000;

export function calculateShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
}

// ============================================================
// 주문 생성 (재고 차감 포함)
// ============================================================

export async function createOrder(userId: string, input: z.infer<typeof createOrderSchema>) {
  const data = createOrderSchema.parse(input);

  return withLock(`order:${userId}`, async () => {
    return prisma.$transaction(async (tx) => {
      // 1. SKU + 재고 조회 & 검증
      let subtotal = 0;
      const orderItems: Array<{
        skuId: string;
        productName: string;
        optionText: string | undefined;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const item of data.items) {
        const sku = await tx.sku.findUnique({
          where: { id: item.skuId },
          include: {
            product: { select: { name: true, status: true } },
            optionValues: { include: { optionValue: { include: { productOption: true } } } },
            inventory: true,
          },
        });

        if (!sku || !sku.isActive || sku.product.status !== 'ACTIVE') {
          throw new Error('판매 중이 아닌 상품이 포함되어 있습니다.');
        }

        if (!sku.inventory || sku.inventory.quantity - sku.inventory.reserved < item.quantity) {
          throw new Error(`"${sku.product.name}" 재고가 부족합니다.`);
        }

        const optionText =
          sku.optionValues
            .map((sov) => `${sov.optionValue.productOption.name}: ${sov.optionValue.value}`)
            .join(' / ') || undefined;

        const totalPrice = sku.price * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          skuId: sku.id,
          productName: sku.product.name,
          optionText,
          quantity: item.quantity,
          unitPrice: sku.price,
          totalPrice,
        });

        // 2. 재고 예약 (reserved 증가)
        await tx.inventory.update({
          where: { skuId: sku.id },
          data: { reserved: { increment: item.quantity } },
        });
      }

      // 3. 쿠폰 할인 계산
      let discountTotal = 0;
      if (data.couponIssueId) {
        const couponIssue = await tx.couponIssue.findUnique({
          where: { id: data.couponIssueId },
          include: { coupon: true },
        });
        if (couponIssue && !couponIssue.usedAt && couponIssue.expiresAt > new Date()) {
          const coupon = couponIssue.coupon;
          if (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount) {
            if (coupon.discountType === 'FIXED_AMOUNT') {
              discountTotal = coupon.discountValue;
            } else {
              discountTotal = Math.floor((subtotal * coupon.discountValue) / 100);
              if (coupon.maxDiscount) {
                discountTotal = Math.min(discountTotal, coupon.maxDiscount);
              }
            }
          }
        }
      }

      // 적립금 차감
      discountTotal += data.pointsUsed;

      // 4. 최종 금액
      const shippingFee = calculateShippingFee(subtotal);
      const totalAmount = Math.max(0, subtotal + shippingFee - discountTotal);

      // 5. 적립금 잔액 검증 (트랜잭션 내부에서)
      if (data.pointsUsed > 0) {
        const lastPoint = await tx.pointHistory.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        const currentBalance = lastPoint?.balance ?? 0;
        if (currentBalance < data.pointsUsed) {
          throw new Error('적립금이 부족합니다.');
        }
      }

      // 6. 주문 생성
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId: data.addressId,
          status: 'PENDING_PAYMENT',
          subtotal,
          shippingFee,
          discountTotal,
          totalAmount,
          couponIssueId: data.couponIssueId,
          pointsUsed: data.pointsUsed,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          zipCode: data.zipCode,
          shippingAddress1: data.shippingAddress1,
          shippingAddress2: data.shippingAddress2,
          shippingMemo: data.shippingMemo,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      // 7. 쿠폰 사용 처리
      if (data.couponIssueId && discountTotal > data.pointsUsed) {
        await tx.couponIssue.update({
          where: { id: data.couponIssueId },
          data: { usedAt: new Date() },
        });
      }

      // 8. 적립금 차감 (잔액은 위에서 이미 검증됨)
      if (data.pointsUsed > 0) {
        const lastPoint = await tx.pointHistory.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        const currentBalance = lastPoint?.balance ?? 0;
        await tx.pointHistory.create({
          data: {
            userId,
            type: 'USE',
            amount: -data.pointsUsed,
            balance: currentBalance - data.pointsUsed,
            reason: `주문 사용 (${order.orderNumber})`,
            orderId: order.id,
          },
        });
      }

      return order;
    });
  });
}

// ============================================================
// 결제 확인 후 주문 확정 (멱등성 보장 + 분산 락)
// ============================================================

export async function confirmOrder(
  orderId: string,
  userId: string,
  paymentData: {
    paymentKey: string;
    method: 'CARD' | 'VIRTUAL_ACCOUNT' | 'BANK_TRANSFER' | 'KAKAO_PAY' | 'NAVER_PAY' | 'TOSS_PAY';
    amount: number;
    receiptUrl?: string;
  },
) {
  return withLock(`order-confirm:${orderId}`, async () => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });

      if (!order) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      // 소유권 검증
      if (order.userId !== userId) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      // 멱등성: 이미 결제 완료된 주문이면 성공 반환
      if (order.status === 'PAID' && order.payment?.status === 'COMPLETED') {
        return order;
      }

      if (order.status !== 'PENDING_PAYMENT') {
        throw new Error('결제 대기 중인 주문이 아닙니다.');
      }

      if (paymentData.amount !== order.totalAmount) {
        throw new Error('결제 금액이 일치하지 않습니다.');
      }

      // 재고 확정 (reserved → quantity 차감) — 상태 변경 전에 수행
      for (const item of order.items) {
        await tx.inventory.update({
          where: { skuId: item.skuId },
          data: {
            quantity: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });
      }

      // 결제 정보 저장
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentData.method,
          status: 'COMPLETED',
          amount: paymentData.amount,
          paymentKey: paymentData.paymentKey,
          receiptUrl: paymentData.receiptUrl,
          paidAt: new Date(),
        },
      });

      // 주문 상태 변경
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      return order;
    });
  });
}

// ============================================================
// 주문 취소
// ============================================================

export async function cancelOrder(orderId: string, userId: string) {
  return withLock(`order-cancel:${orderId}`, async () => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });

      if (!order || order.userId !== userId) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      if (!['PENDING_PAYMENT', 'PAID'].includes(order.status)) {
        throw new Error('취소 가능한 상태가 아닙니다. CS로 문의해주세요.');
      }

      // 재고 복원
      for (const item of order.items) {
        if (order.status === 'PENDING_PAYMENT') {
          await tx.inventory.update({
            where: { skuId: item.skuId },
            data: { reserved: { decrement: item.quantity } },
          });
        } else {
          // PAID 상태: 실재고 복원 (confirmOrder에서 이미 차감됨)
          await tx.inventory.update({
            where: { skuId: item.skuId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      // 적립금 복원
      if (order.pointsUsed > 0) {
        const lastPoint = await tx.pointHistory.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        await tx.pointHistory.create({
          data: {
            userId,
            type: 'CANCEL',
            amount: order.pointsUsed,
            balance: (lastPoint?.balance ?? 0) + order.pointsUsed,
            reason: `주문 취소 복원 (${order.orderNumber})`,
            orderId: order.id,
          },
        });
      }

      // 쿠폰 복원
      if (order.couponIssueId) {
        await tx.couponIssue.update({
          where: { id: order.couponIssueId },
          data: { usedAt: null },
        });
      }

      // 주문 상태 변경
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      return order;
    });
  });
}
