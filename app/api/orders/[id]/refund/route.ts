import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

const refundRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { id } = await params;

  const body = await request.json();
  const parsed = refundRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('환불 사유를 입력해주세요.', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { refunds: true },
  });

  if (!order || order.userId !== userId) {
    return apiError('주문을 찾을 수 없습니다.', 404);
  }

  if (!['PAID', 'DELIVERED', 'CONFIRMED'].includes(order.status)) {
    return apiError('환불 요청이 불가능한 주문 상태입니다.', 400);
  }

  const pendingRefund = order.refunds.find(
    (r: { status: string }) => r.status === 'REQUESTED' || r.status === 'PROCESSING',
  );
  if (pendingRefund) {
    return apiError('이미 처리 중인 환불 요청이 있습니다.', 400);
  }

  const refund = await prisma.refund.create({
    data: {
      orderId: id,
      reason: parsed.data.reason,
      amount: order.totalAmount,
      status: 'REQUESTED',
    },
  });

  return apiSuccess(refund, 201);
}
