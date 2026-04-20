import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils/api-response';

const updateReviewSchema = z.object({
  isVisible: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = updateReviewSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('isVisible 값이 필요합니다.', 400);
  }

  const review = await prisma.review.findUnique({
    where: { id, deletedAt: null },
  });

  if (!review) {
    return apiError('리뷰를 찾을 수 없습니다.', 404);
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { isVisible: parsed.data.isVisible },
  });

  await logAudit({
    adminUserId: ctx.session.adminUser.id,
    action: 'UPDATE',
    entity: 'Review',
    entityId: id,
    changes: { isVisible: [review.isVisible, updated.isVisible] },
    ipAddress: ctx.ip,
  });

  return apiSuccess(updated);
}
