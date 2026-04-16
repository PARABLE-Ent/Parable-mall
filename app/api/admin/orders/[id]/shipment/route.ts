import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils/api-response';

const createShipmentSchema = z.object({
  carrier: z.string().min(1),
  trackingNo: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = createShipmentSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('배송사와 송장번호를 입력해주세요.', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id, deletedAt: null },
  });

  if (!order) {
    return apiError('주문을 찾을 수 없습니다.', 404);
  }

  const [shipment] = await prisma.$transaction([
    prisma.shipment.create({
      data: {
        orderId: id,
        carrier: parsed.data.carrier,
        trackingNo: parsed.data.trackingNo,
        status: 'SHIPPED',
        shippedAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id },
      data: { status: 'SHIPPING' },
    }),
  ]);

  return apiSuccess(shipment, 201);
}
