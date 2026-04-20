import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { getIdempotentResult, paymentRateLimit, setIdempotentResult } from '@/lib/cache/rate-limit';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { confirmKakao } from '@/lib/payments';
import { confirmOrder } from '@/server/order';

const schema = z.object({
  orderId: z.string().min(1),
  tid: z.string().min(1),
  pgToken: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const idempotencyKey = headersList.get('idempotency-key');

  const rl = await paymentRateLimit(session.user.id, ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: '결제 요청이 너무 많습니다.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } },
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (idempotencyKey) {
    const cached = await getIdempotentResult<{ success: boolean; orderNumber: string }>(
      `kakao:${session.user.id}:${idempotencyKey}`,
    );
    if (cached) return NextResponse.json(cached);
  }

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    const confirmed = await confirmKakao({
      tid: parsed.data.tid,
      partnerOrderId: order.orderNumber,
      partnerUserId: session.user.id,
      pgToken: parsed.data.pgToken,
      expectedAmount: order.totalAmount,
    });
    const updated = await confirmOrder(order.id, session.user.id, {
      paymentKey: confirmed.paymentKey,
      method: confirmed.method,
      amount: confirmed.amount,
    });
    const response = { success: true, orderNumber: updated.orderNumber };
    if (idempotencyKey) {
      await setIdempotentResult(`kakao:${session.user.id}:${idempotencyKey}`, response);
    }
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 처리에 실패했습니다.';
    logger.warn('payment.kakao_failed', { orderId: order.id, error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
