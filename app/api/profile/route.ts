import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  phone: z.string().min(1).max(20).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      gradeLevel: true,
      totalSpent: true,
      createdAt: true,
    },
  });

  if (!user) return apiError('사용자를 찾을 수 없습니다.', 404);

  const lastPoint = await prisma.pointHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { balance: true },
  });

  return apiSuccess({
    ...user,
    pointsBalance: lastPoint?.balance ?? 0,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('입력값이 올바르지 않습니다.', 400);
  }

  if (Object.keys(parsed.data).length === 0) {
    return apiError('변경할 항목이 없습니다.', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      gradeLevel: true,
      totalSpent: true,
      createdAt: true,
    },
  });

  return apiSuccess(user);
}
