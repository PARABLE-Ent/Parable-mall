import { z } from 'zod';

import { prisma } from '@/lib/db';

// ============================================================
// Schemas
// ============================================================

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  parentId: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ============================================================
// Use Cases
// ============================================================

export async function listCategories() {
  return prisma.category.findMany({
    where: { deletedAt: null },
    include: {
      children: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getCategoryTree() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null, parentId: null },
    include: {
      children: {
        where: { deletedAt: null },
        include: {
          children: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
  return categories;
}

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const data = createCategorySchema.parse(input);

  const existing = await prisma.category.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    throw new Error('이미 사용 중인 슬러그입니다.');
  }

  return prisma.category.create({ data });
}

export async function updateCategory(id: string, input: z.infer<typeof updateCategorySchema>) {
  const data = updateCategorySchema.parse(input);
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  const hasProducts = await prisma.product.count({
    where: { categoryId: id, deletedAt: null },
  });
  if (hasProducts > 0) {
    throw new Error('상품이 있는 카테고리는 삭제할 수 없습니다.');
  }

  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
