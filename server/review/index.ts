import { z } from 'zod';

import { withLock } from '@/lib/cache/lock';
import { prisma } from '@/lib/db';

export const createReviewSchema = z.object({
  productId: z.string(),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10).max(2000),
  imageUrls: z.array(z.string().url()).max(5).default([]),
});

export const createQnASchema = z.object({
  productId: z.string(),
  question: z.string().min(5).max(1000),
  isSecret: z.boolean().default(false),
});

// ============================================================
// 리뷰
// ============================================================

export async function createReview(userId: string, input: z.infer<typeof createReviewSchema>) {
  const data = createReviewSchema.parse(input);

  // 구매 인증 확인
  let isVerified = false;
  if (data.orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId,
        status: { in: ['DELIVERED', 'CONFIRMED'] },
        items: { some: { sku: { productId: data.productId } } },
      },
    });
    isVerified = !!order;
  }

  // 중복 리뷰 확인
  if (data.orderId) {
    const existingReview = await prisma.review.findFirst({
      where: { userId, productId: data.productId, orderId: data.orderId, deletedAt: null },
    });
    if (existingReview) {
      throw new Error('이미 이 주문에 대한 리뷰를 작성하셨습니다.');
    }
  }

  const isPhotoReview = data.imageUrls.length > 0;

  // 적립금 잔액 경쟁조건 방지를 위한 사용자별 락
  const review = await withLock(`user-points:${userId}`, () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          userId,
          productId: data.productId,
          orderId: data.orderId,
          rating: data.rating,
          content: data.content,
          isPhotoReview,
          isVerified,
          images:
            data.imageUrls.length > 0
              ? {
                  create: data.imageUrls.map((url, i) => ({
                    url,
                    sortOrder: i,
                  })),
                }
              : undefined,
        },
      });

      // 적립금 지급
      const pointAmount = isPhotoReview ? 500 : 200;
      const lastPoint = await tx.pointHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastPoint?.balance ?? 0;

      await tx.pointHistory.create({
        data: {
          userId,
          type: 'EARN',
          amount: pointAmount,
          balance: currentBalance + pointAmount,
          reason: isPhotoReview ? '포토리뷰 작성 적립금' : '텍스트리뷰 작성 적립금',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      return created;
    }),
  );

  return review;
}

export async function getProductReviews(productId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isVisible: true, deletedAt: null },
      include: {
        user: { select: { name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({
      where: { productId, isVisible: true, deletedAt: null },
    }),
  ]);

  const avgRating = await prisma.review.aggregate({
    where: { productId, isVisible: true, deletedAt: null },
    _avg: { rating: true },
  });

  return {
    reviews,
    avgRating: avgRating._avg.rating ?? 0,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ============================================================
// Q&A
// ============================================================

export async function createQnA(userId: string, input: z.infer<typeof createQnASchema>) {
  const data = createQnASchema.parse(input);
  return prisma.qnA.create({
    data: {
      userId,
      productId: data.productId,
      question: data.question,
      isSecret: data.isSecret,
    },
  });
}

export async function answerQnA(qnaId: string, answer: string) {
  return prisma.qnA.update({
    where: { id: qnaId },
    data: { answer, isAnswered: true },
  });
}

export async function getProductQnAs(productId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [qnas, total] = await Promise.all([
    prisma.qnA.findMany({
      where: { productId, deletedAt: null },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.qnA.count({ where: { productId, deletedAt: null } }),
  ]);

  return {
    qnas,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
