import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { id } = await params;

  const item = await prisma.wishlistItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    return apiError('찜 항목을 찾을 수 없습니다.', 404);
  }

  await prisma.wishlistItem.delete({ where: { id } });

  return apiSuccess({ deleted: true });
}
