import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { createCoupon, createCouponSchema } from '@/server/coupon';

export async function GET(request: Request) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const coupons = await prisma.coupon.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { issues: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(coupons);
}

export async function POST(request: Request) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createCouponSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const coupon = await createCoupon(parsed.data);
    await logAudit({
      adminUserId: ctx.session.adminUser.id,
      action: 'CREATE',
      entity: 'Coupon',
      entityId: coupon.id,
      changes: { name: [null, coupon.name] },
      ipAddress: ctx.ip,
    });
    return NextResponse.json(coupon, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '쿠폰 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
