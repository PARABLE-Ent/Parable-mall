import { auth } from '@/lib/auth';
import { orderRateLimit } from '@/lib/cache/rate-limit';
import { prisma } from '@/lib/db';
import {
  apiError,
  apiPaginated,
  apiSuccess,
  buildPagination,
  getPaginationParams,
} from '@/lib/utils/api-response';
import { createOrder, createOrderSchema } from '@/server/order';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const status = searchParams.get('status') ?? undefined;

  const where = {
    userId,
    deletedAt: null,
    ...(status ? { status: status as never } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        payment: { select: { method: true, status: true, paidAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return apiPaginated(orders, buildPagination(page, limit, total));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);

  const rl = await orderRateLimit(session.user.id);
  if (!rl.success) {
    return apiError('주문 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);
  }

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('입력값이 올바르지 않습니다.', 400);
  }

  try {
    const { order, paymentExpiresAt } = await createOrder(session.user.id, parsed.data);
    return apiSuccess({ ...order, paymentExpiresAt }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : '주문 생성에 실패했습니다.';
    return apiError(message, 400);
  }
}
