import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db';

// ============================================================
// Schemas
// ============================================================

const optionValueSchema = z.object({
  value: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

const productOptionSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  values: z.array(optionValueSchema).min(1),
});

const skuSchema = z.object({
  skuCode: z.string().min(1),
  price: z.number().int().positive(),
  optionValueIndices: z.array(z.number().int()), // 옵션 값 인덱스 조합
  quantity: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  content: z.string().optional(),
  basePrice: z.number().int().positive(),
  salePrice: z.number().int().positive().optional(),
  costPrice: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  options: z.array(productOptionSchema).default([]),
  skus: z.array(skuSchema).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  categoryId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'SOLDOUT']).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
});

// ============================================================
// Use Cases
// ============================================================

export async function listProducts(query: z.infer<typeof productListQuerySchema>) {
  const { page, limit, categoryId, status, search, sort } = productListQuerySchema.parse(query);
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(categoryId && { categoryId }),
    ...(status && { status }),
    ...(search && {
      OR: [{ name: { contains: search, mode: 'insensitive' } }, { tags: { has: search } }],
    }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc'
      ? { basePrice: 'asc' }
      : sort === 'price_desc'
        ? { basePrice: 'desc' }
        : sort === 'name'
          ? { name: 'asc' }
          : { createdAt: 'desc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { reviews: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProduct(idOrSlug: string) {
  const where: Prisma.ProductWhereInput = idOrSlug.includes('-')
    ? { slug: idOrSlug, deletedAt: null }
    : { id: idOrSlug, deletedAt: null };

  return prisma.product.findFirst({
    where,
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      options: {
        include: { optionValues: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      },
      skus: {
        where: { isActive: true },
        include: {
          optionValues: { include: { optionValue: true } },
          inventory: true,
        },
      },
      reviews: {
        where: { isVisible: true, deletedAt: null },
        include: { user: { select: { name: true } }, images: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { reviews: true } },
    },
  });
}

export async function createProduct(input: z.infer<typeof createProductSchema>) {
  const data = createProductSchema.parse(input);

  const existing = await prisma.product.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    throw new Error('이미 사용 중인 슬러그입니다.');
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        content: data.content,
        basePrice: data.basePrice,
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        tags: data.tags,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        status: 'DRAFT',
      },
    });

    // 옵션 생성
    const optionValueMap: string[][] = [];
    for (const option of data.options) {
      const created = await tx.productOption.create({
        data: {
          productId: product.id,
          name: option.name,
          sortOrder: option.sortOrder,
          optionValues: {
            create: option.values.map((v, i) => ({
              value: v.value,
              sortOrder: v.sortOrder ?? i,
            })),
          },
        },
        include: { optionValues: true },
      });
      optionValueMap.push(created.optionValues.map((ov) => ov.id));
    }

    // SKU 생성
    for (const sku of data.skus) {
      const createdSku = await tx.sku.create({
        data: {
          productId: product.id,
          skuCode: sku.skuCode,
          price: sku.price,
          isActive: sku.isActive,
          inventory: {
            create: { quantity: sku.quantity },
          },
        },
      });

      // SKU-옵션값 매핑
      for (let i = 0; i < sku.optionValueIndices.length; i++) {
        const optionValueId = optionValueMap[i]?.[sku.optionValueIndices[i]];
        if (optionValueId) {
          await tx.skuOptionValue.create({
            data: { skuId: createdSku.id, optionValueId },
          });
        }
      }
    }

    return product;
  });
}

export async function updateProduct(id: string, input: z.infer<typeof updateProductSchema>) {
  const data = updateProductSchema.parse(input);
  const { options: _, skus: __, ...productData } = data;
  void _;
  void __;

  return prisma.product.update({
    where: { id },
    data: productData,
  });
}

export async function deleteProduct(id: string) {
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });
}

export async function updateProductStatus(id: string, status: 'DRAFT' | 'ACTIVE' | 'INACTIVE') {
  return prisma.product.update({
    where: { id },
    data: { status },
  });
}
