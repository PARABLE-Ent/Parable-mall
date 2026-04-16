import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { createOrder, createOrderSchema } from '@/server/order';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const order = await createOrder(session.user.id, parsed.data);
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '주문 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
