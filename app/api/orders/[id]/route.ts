import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id, deletedAt: null },
    include: {
      items: {
        include: {
          sku: {
            include: {
              product: { select: { id: true, slug: true, images: { take: 1 } } },
            },
          },
        },
      },
      payment: true,
      shipments: true,
      refunds: true,
    },
  });

  if (!order || order.userId !== userId) {
    return apiError('주문을 찾을 수 없습니다.', 404);
  }

  return apiSuccess(order);
}
