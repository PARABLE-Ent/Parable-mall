import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { confirmPayment, mapTossMethod, tossConfirmSchema } from '@/lib/payments/toss';
import { confirmOrder } from '@/server/order';

const callbackSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  try {
    // 1. 토스페이먼츠 결제 확인
    const tossResult = await confirmPayment(tossConfirmSchema.parse(parsed.data));

    // 2. 주문 확정 (재고 차감 + 소유권 검증)
    const order = await confirmOrder(parsed.data.orderId, session.user.id, {
      paymentKey: tossResult.paymentKey,
      method: mapTossMethod(tossResult.method),
      amount: tossResult.totalAmount,
      receiptUrl: tossResult.receipt?.url,
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '결제 처리에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
