import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { getIdempotentResult, paymentRateLimit, setIdempotentResult } from '@/lib/cache/rate-limit';
import { logger } from '@/lib/logger';
import { confirmToss } from '@/lib/payments';
import { confirmOrder } from '@/server/order';

const callbackSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const idempotencyKey = headersList.get('idempotency-key') ?? null;

  const rl = await paymentRateLimit(session.user.id, ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: '결제 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } },
    );
  }

  const body = await request.json();
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  // Idempotency 키 기반 캐시 재사용. 주문 확정 자체가 멱등하지만 응답 일관성을 위해.
  if (idempotencyKey) {
    const cached = await getIdempotentResult<{ success: boolean; orderNumber: string }>(
      `toss:${session.user.id}:${idempotencyKey}`,
    );
    if (cached) return NextResponse.json(cached);
  }

  try {
    const confirmed = await confirmToss(parsed.data);
    const order = await confirmOrder(parsed.data.orderId, session.user.id, {
      paymentKey: confirmed.paymentKey,
      method: confirmed.method,
      amount: confirmed.amount,
      receiptUrl: confirmed.receiptUrl,
    });
    const response = { success: true, orderNumber: order.orderNumber };
    if (idempotencyKey) {
      await setIdempotentResult(`toss:${session.user.id}:${idempotencyKey}`, response);
    }
    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : '결제 처리에 실패했습니다.';
    logger.warn('payment.toss_failed', {
      orderId: parsed.data.orderId,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
