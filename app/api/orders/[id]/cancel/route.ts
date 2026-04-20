import { auth } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { cancelOrder } from '@/server/order';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { id } = await params;

  try {
    const order = await cancelOrder(id, userId);
    return apiSuccess(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : '주문 취소에 실패했습니다.';
    return apiError(message, 400);
  }
}
