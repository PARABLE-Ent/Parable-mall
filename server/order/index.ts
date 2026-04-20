import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { withLock } from '@/lib/cache/lock';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

import { determineTier, earningFor, recalcMembership } from './membership';

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

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ============================================================
// 상수
// ============================================================

const FREE_SHIPPING_THRESHOLD = 50_000;
const BASE_SHIPPING_FEE = 3_000;
const PAYMENT_TIMEOUT_MINUTES = 30; // 결제 미완료 주문 자동 취소 시간
const POINT_EXPIRY_DAYS = 365;

// ============================================================
// 유틸
// ============================================================

export function calculateShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${random}`;
}

async function latestBalance(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const last = await tx.pointHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return last?.balance ?? 0;
}

// ============================================================
// 주문 생성 (재고 예약 + 쿠폰 가드 + 적립금 차감)
// ============================================================

export async function createOrder(userId: string, input: CreateOrderInput) {
  const data = createOrderSchema.parse(input);

  return withLock(`order:${userId}`, async () => {
    return prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItems: Array<{
        skuId: string;
        productName: string;
        optionText: string | undefined;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      // 1) SKU 조회 + 재고 예약
      for (const item of data.items) {
        const sku = await tx.sku.findUnique({
          where: { id: item.skuId },
          include: {
            product: { select: { name: true, status: true, categoryId: true } },
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

        await tx.inventory.update({
          where: { skuId: sku.id },
          data: { reserved: { increment: item.quantity } },
        });
      }

      // 2) 쿠폰 할인 계산
      let couponDiscount = 0;
      if (data.couponIssueId) {
        const couponIssue = await tx.couponIssue.findUnique({
          where: { id: data.couponIssueId },
          include: { coupon: true },
        });
        if (!couponIssue || couponIssue.userId !== userId) {
          throw new Error('사용할 수 없는 쿠폰입니다.');
        }
        if (couponIssue.usedAt) throw new Error('이미 사용된 쿠폰입니다.');
        if (couponIssue.expiresAt <= new Date()) throw new Error('만료된 쿠폰입니다.');
        const coupon = couponIssue.coupon;
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          throw new Error(
            `쿠폰 최소 주문 금액(${coupon.minOrderAmount.toLocaleString('ko-KR')}원)을 만족하지 않습니다.`,
          );
        }
        // 등급 한정 쿠폰 — 사용자 현재 등급 이상이어야 사용 가능.
        if (coupon.gradeLevel) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { gradeLevel: true },
          });
          const order: Record<string, number> = { NORMAL: 0, SILVER: 1, GOLD: 2, VIP: 3 };
          if ((order[user?.gradeLevel ?? 'NORMAL'] ?? 0) < (order[coupon.gradeLevel] ?? 0)) {
            throw new Error('해당 등급에서만 사용 가능한 쿠폰입니다.');
          }
        }

        if (coupon.discountType === 'FIXED_AMOUNT') {
          couponDiscount = Math.min(coupon.discountValue, subtotal);
        } else {
          couponDiscount = Math.floor((subtotal * coupon.discountValue) / 100);
          if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
        }
      }

      // 3) 적립금 잔액 검증
      if (data.pointsUsed > 0) {
        const balance = await latestBalance(tx, userId);
        if (balance < data.pointsUsed) throw new Error('적립금이 부족합니다.');
      }

      const discountTotal = couponDiscount + data.pointsUsed;
      const shippingFee = calculateShippingFee(subtotal);
      const totalAmount = Math.max(0, subtotal + shippingFee - discountTotal);

      const paymentExpiresAt = new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

      // 4) 주문 생성
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
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // 결제 만료 시각은 별도 컬럼이 없어 메모 필드 대신 notification 로 전달하지 않고
      // 값만 반환한다. 스케줄 잡은 updatedAt + timeout 으로 동등하게 계산 가능.

      // 5) 쿠폰 사용 표시 (선 차감 — 취소 시 복원)
      if (data.couponIssueId) {
        await tx.couponIssue.update({
          where: { id: data.couponIssueId },
          data: { usedAt: new Date() },
        });
      }

      // 6) 적립금 차감 이력
      if (data.pointsUsed > 0) {
        const balance = await latestBalance(tx, userId);
        await tx.pointHistory.create({
          data: {
            userId,
            type: 'USE',
            amount: -data.pointsUsed,
            balance: balance - data.pointsUsed,
            reason: `주문 사용 (${order.orderNumber})`,
            orderId: order.id,
          },
        });
      }

      logger.info('order.created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
        userId,
      });

      return { order, paymentExpiresAt };
    });
  });
}

// ============================================================
// 결제 확정 (멱등 + 락 + 등급 재계산 + 구매 적립금 지급)
// ============================================================

export async function confirmOrder(
  orderId: string,
  userId: string,
  paymentData: {
    paymentKey: string;
    method: 'CARD' | 'VIRTUAL_ACCOUNT' | 'BANK_TRANSFER' | 'KAKAO_PAY' | 'NAVER_PAY' | 'TOSS_PAY';
    amount: number;
    receiptUrl?: string;
    rawResponse?: Prisma.InputJsonValue;
  },
) {
  return withLock(`order-confirm:${orderId}`, async () => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
      if (!order) throw new Error('주문을 찾을 수 없습니다.');
      if (order.userId !== userId) throw new Error('주문을 찾을 수 없습니다.');

      // 멱등: 이미 결제 완료 상태면 동일 응답
      if (order.status !== 'PENDING_PAYMENT') {
        if (order.payment?.status === 'COMPLETED') return order;
        throw new Error('결제 대기 중인 주문이 아닙니다.');
      }

      if (paymentData.amount !== order.totalAmount) {
        throw new Error('결제 금액이 일치하지 않습니다.');
      }

      // 재고 확정 (reserved → quantity 차감)
      for (const item of order.items) {
        await tx.inventory.update({
          where: { skuId: item.skuId },
          data: {
            quantity: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });
      }

      // 결제 레코드 기록
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentData.method,
          status: 'COMPLETED',
          amount: paymentData.amount,
          paymentKey: paymentData.paymentKey,
          receiptUrl: paymentData.receiptUrl,
          rawResponse: paymentData.rawResponse ?? undefined,
          paidAt: new Date(),
        },
      });

      // 주문 상태 변경
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      // 누적 구매액 / 등급 재계산 (CANCELLED/RETURNED 제외, 이번 PAID 포함)
      await recalcMembership(tx, userId);

      // 구매 적립금 지급 (업데이트된 등급 기준)
      const userAfter = await tx.user.findUnique({
        where: { id: userId },
        select: { totalSpent: true },
      });
      const earnAmount = earningFor(userAfter?.totalSpent ?? 0, order.totalAmount);
      if (earnAmount > 0) {
        const balance = await latestBalance(tx, userId);
        await tx.pointHistory.create({
          data: {
            userId,
            type: 'EARN',
            amount: earnAmount,
            balance: balance + earnAmount,
            reason: `주문 구매 적립 (${order.orderNumber}, ${determineTier(userAfter?.totalSpent ?? 0).grade})`,
            orderId: order.id,
            expiresAt: new Date(Date.now() + POINT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          },
        });
      }

      // 장바구니 정리 (구매한 SKU)
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, skuId: { in: order.items.map((i) => i.skuId) } },
        });
      }

      logger.info('order.paid', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: paymentData.amount,
        method: paymentData.method,
        earnedPoints: earnAmount,
      });

      return updated;
    });
  });
}

// ============================================================
// 주문 취소 (고객/시스템 공용)
// ============================================================

export async function cancelOrder(orderId: string, userId: string | null, reason = '고객 취소') {
  return withLock(`order-cancel:${orderId}`, async () => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
      if (!order) throw new Error('주문을 찾을 수 없습니다.');
      if (userId !== null && order.userId !== userId) {
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
          await tx.inventory.update({
            where: { skuId: item.skuId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      // 적립금 복원
      if (order.pointsUsed > 0) {
        const balance = await latestBalance(tx, order.userId);
        await tx.pointHistory.create({
          data: {
            userId: order.userId,
            type: 'CANCEL',
            amount: order.pointsUsed,
            balance: balance + order.pointsUsed,
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

      // PAID 상태에서 취소되는 경우, 이미 적립된 구매 적립금을 회수하고 등급 재계산.
      if (order.status === 'PAID') {
        const earnRecord = await tx.pointHistory.findFirst({
          where: { orderId: order.id, type: 'EARN' },
          orderBy: { createdAt: 'desc' },
        });
        if (earnRecord && earnRecord.amount > 0) {
          const balance = await latestBalance(tx, order.userId);
          await tx.pointHistory.create({
            data: {
              userId: order.userId,
              type: 'CANCEL',
              amount: -earnRecord.amount,
              balance: balance - earnRecord.amount,
              reason: `주문 취소에 따른 적립 회수 (${order.orderNumber})`,
              orderId: order.id,
            },
          });
        }
        await recalcMembership(tx, order.userId);
      }

      logger.info('order.cancelled', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason,
      });

      return order;
    });
  });
}

// ============================================================
// 결제 대기 주문 자동 취소 (크론/관리자 실행)
// ============================================================

export async function expireStalePendingOrders(options: { timeoutMinutes?: number } = {}) {
  const minutes = options.timeoutMinutes ?? PAYMENT_TIMEOUT_MINUTES;
  const threshold = new Date(Date.now() - minutes * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: threshold } },
    select: { id: true, userId: true, orderNumber: true },
  });

  const results: Array<{ orderId: string; success: boolean; error?: string }> = [];
  for (const order of stale) {
    try {
      await cancelOrder(order.id, null, 'payment_timeout');
      results.push({ orderId: order.id, success: true });
    } catch (err) {
      results.push({
        orderId: order.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  logger.info('order.expire_stale_done', {
    count: stale.length,
    success: results.filter((r) => r.success).length,
  });
  return { total: stale.length, results };
}

// 외부에서 사용하는 상수 재-export
export { PAYMENT_TIMEOUT_MINUTES, FREE_SHIPPING_THRESHOLD, BASE_SHIPPING_FEE };
