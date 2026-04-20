import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

const addressSchema = z.object({
  label: z.string().optional(),
  recipient: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  zipCode: z.string().min(1).optional(),
  address1: z.string().min(1).optional(),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { id } = await params;

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId || existing.deletedAt) {
    return apiError('배송지를 찾을 수 없습니다.', 404);
  }

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('입력값이 올바르지 않습니다.', 400);
  }

  // If setting as default, unset other defaults
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data: parsed.data,
  });

  return apiSuccess(address);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { id } = await params;

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId || existing.deletedAt) {
    return apiError('배송지를 찾을 수 없습니다.', 404);
  }

  await prisma.address.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
}
