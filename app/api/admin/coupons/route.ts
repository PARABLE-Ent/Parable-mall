import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';
import { createCoupon, createCouponSchema } from '@/server/coupon';

export async function GET() {
  await requireAdmin();
  const coupons = await prisma.coupon.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { issues: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(coupons);
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = createCouponSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const coupon = await createCoupon(parsed.data);
    return NextResponse.json(coupon, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '쿠폰 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
