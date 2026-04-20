import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shop.parable-ent.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/signup`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/about`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const categories = await prisma.category.findMany({
    where: { deletedAt: null, isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const categoryPages: MetadataRoute.Sitemap = categories.map(
    (cat: { slug: string; updatedAt: Date }) => ({
      url: `${BASE_URL}/categories/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }),
  );

  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: { slug: true, updatedAt: true },
  });

  const productPages: MetadataRoute.Sitemap = products.map(
    (prod: { slug: string; updatedAt: Date }) => ({
      url: `${BASE_URL}/products/${prod.slug}`,
      lastModified: prod.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
  );

  return [...staticPages, ...categoryPages, ...productPages];
}
