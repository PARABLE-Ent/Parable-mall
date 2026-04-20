import { z } from 'zod';

import { prisma } from '@/lib/db';
import { redis } from '@/lib/cache/redis';

const GUEST_CART_PREFIX = 'cart:guest:';
const GUEST_CART_TTL = 7 * 24 * 60 * 60; // 7일

export const addToCartSchema = z.object({
  skuId: z.string(),
  quantity: z.number().int().positive().max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(99),
});

// ============================================================
// 회원 장바구니 (DB)
// ============================================================

export async function getCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          sku: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, status: true },
              },
              optionValues: {
                include: { optionValue: true },
              },
              inventory: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true, status: true },
                },
                optionValues: {
                  include: { optionValue: true },
                },
                inventory: true,
              },
            },
          },
        },
      },
    });
  }

  return cart;
}

export async function addToCart(userId: string, input: z.infer<typeof addToCartSchema>) {
  const { skuId, quantity } = addToCartSchema.parse(input);

  const cart = await getCart(userId);

  const existingItem = cart.items.find(
    (item: { skuId: string; id: string; quantity: number }) => item.skuId === skuId,
  );

  if (existingItem) {
    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  }

  return prisma.cartItem.create({
    data: { cartId: cart.id, skuId, quantity },
  });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: z.infer<typeof updateCartItemSchema>,
) {
  const { quantity } = updateCartItemSchema.parse(input);

  const cart = await getCart(userId);
  const item = cart.items.find((i: { id: string }) => i.id === itemId);
  if (!item) throw new Error('장바구니 항목을 찾을 수 없습니다.');

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });
}

export async function removeCartItem(userId: string, itemId: string) {
  const cart = await getCart(userId);
  const item = cart.items.find((i: { id: string }) => i.id === itemId);
  if (!item) throw new Error('장바구니 항목을 찾을 수 없습니다.');

  return prisma.cartItem.delete({ where: { id: itemId } });
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  return prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

// ============================================================
// 비회원 장바구니 (Redis)
// ============================================================

interface GuestCartItem {
  skuId: string;
  quantity: number;
}

export async function getGuestCart(guestId: string): Promise<GuestCartItem[]> {
  const data = await redis.get<string>(`${GUEST_CART_PREFIX}${guestId}`);
  if (!data) return [];
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed as GuestCartItem[];
  } catch {
    return [];
  }
}

export async function setGuestCart(guestId: string, items: GuestCartItem[]) {
  await redis.set(`${GUEST_CART_PREFIX}${guestId}`, JSON.stringify(items), {
    ex: GUEST_CART_TTL,
  });
}

export async function addToGuestCart(guestId: string, input: z.infer<typeof addToCartSchema>) {
  const { skuId, quantity } = addToCartSchema.parse(input);
  const items = await getGuestCart(guestId);

  const existing = items.find((i) => i.skuId === skuId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ skuId, quantity });
  }

  await setGuestCart(guestId, items);
  return items;
}

// 로그인 시 비회원 장바구니 → 회원 장바구니 머지
export async function mergeGuestCartToUser(guestId: string, userId: string) {
  const guestItems = await getGuestCart(guestId);
  if (guestItems.length === 0) return;

  for (const item of guestItems) {
    await addToCart(userId, { skuId: item.skuId, quantity: item.quantity });
  }

  await redis.del(`${GUEST_CART_PREFIX}${guestId}`);
}
