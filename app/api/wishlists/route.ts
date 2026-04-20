import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  apiError,
  apiPaginated,
  apiSuccess,
  buildPagination,
  getPaginationParams,
} from '@/lib/utils/api-response';

const addWishlistSchema = z.object({
  productId: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.wishlistItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            salePrice: true,
            status: true,
            images: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.wishlistItem.count({ where }),
  ]);

  return apiPaginated(items, buildPagination(page, limit, total));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const body = await request.json();
  const parsed = addWishlistSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('상품 ID가 필요합니다.', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product) {
    return apiError('상품을 찾을 수 없습니다.', 404);
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: { userId, productId: parsed.data.productId },
    },
  });
  if (existing) {
    return apiError('이미 찜한 상품입니다.', 409);
  }

  const item = await prisma.wishlistItem.create({
    data: {
      userId,
      productId: parsed.data.productId,
    },
  });

  return apiSuccess(item, 201);
}
