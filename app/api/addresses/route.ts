import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

const addressSchema = z.object({
  label: z.string().optional(),
  recipient: z.string().min(1),
  phone: z.string().min(1),
  zipCode: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const addresses = await prisma.address.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return apiSuccess(addresses);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('입력값이 올바르지 않습니다.', 400);
  }

  // If this address is set as default, unset other defaults
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId,
      ...parsed.data,
    },
  });

  return apiSuccess(address, 201);
}
