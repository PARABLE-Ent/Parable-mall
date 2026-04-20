import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils/api-response';

const updateStatusSchema = z.object({
  status: z.enum([
    'PAID',
    'PREPARING',
    'SHIPPING',
    'DELIVERED',
    'CONFIRMED',
    'CANCELLED',
    'RETURNED',
    'EXCHANGED',
  ]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      parsed.error.flatten().fieldErrors.status?.[0] ?? '유효하지 않은 상태값입니다.',
      400,
    );
  }

  const order = await prisma.order.findUnique({
    where: { id, deletedAt: null },
  });

  if (!order) {
    return apiError('주문을 찾을 수 없습니다.', 404);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    adminUserId: ctx.session.adminUser.id,
    action: 'UPDATE',
    entity: 'Order',
    entityId: id,
    changes: { status: [order.status, updated.status] },
    ipAddress: ctx.ip,
  });

  return apiSuccess(updated);
}
